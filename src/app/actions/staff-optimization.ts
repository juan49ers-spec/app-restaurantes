'use server'

import { createClient } from "@/lib/supabaseServer"
import { subDays, format, getDay } from "date-fns"

export interface StaffEfficiencyData {
    date: string
    revenue: number
    laborCost: number
    laborCostPct: number
    hoursWorked: number
    isOverstaffed: boolean // Labor Cost % > Threshold
    dayOfWeek?: number // 0=Sunday, 1=Monday, etc.
}

// What-If Simulation: "If you reduce 1 shift on X day, you save Y€"
export interface WhatIfSimulation {
    targetDay: string // e.g., "martes"
    targetDayNumber: number // 2 = Tuesday
    currentShifts: number
    suggestedShifts: number
    potentialSavingsPerMonth: number
}

// Trend vs Last Month
export interface TrendData {
    currentPct: number
    previousPct: number
    changePercent: number // Positive = worse (costs up), Negative = better
    isImproving: boolean
}

// Smart Recommendation with context - ENHANCED
export interface SmartRecommendation {
    day: string // "martes"
    timeSlot: string // "cena"
    currentStaff: number
    suggestedStaff: number
    avgCovers: number // Average customers/covers for that slot
    rationale: string
    // Phase 1 Enhancements
    estimatedSavings: number // Monthly savings in €
    confidenceLevel: 1 | 2 | 3 | 4 | 5 // 1-5 stars
    weeksOfData: number // How many weeks of data this is based on
    actionId: string // Unique ID for tracking CTA clicks
    priority: 'high' | 'medium' | 'low'
}

export interface StaffEfficiencySummary {
    shiftCount: number
    totalLaborCost: number
    avgLaborCostPct: number
    overstaffedDays: number
    moneyLostToOverstaffing: number // The "Teaser" number
    dailyData: StaffEfficiencyData[]
    topOverstaffedDays: { date: string; excess: number; dayOfWeek: number }[]
    // NEW: Advanced Features
    whatIfSimulation: WhatIfSimulation | null
    trendVsLastMonth: TrendData | null
    smartRecommendation: SmartRecommendation | null
}

const LABOR_COST_THRESHOLD = 0.45 // 45% trigger (Spanish restaurants typically run 35-45%)
const OPTIMAL_LABOR_COST = 0.35 // 35% is the target for well-optimized restaurants
const MIN_EXCESS_THRESHOLD = 20 // Ignore tiny inefficiencies under 20€
const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export async function getStaffEfficiency(
    restaurantId: string,
    startDate?: string,
    endDate?: string
): Promise<StaffEfficiencySummary> {
    const supabase = await createClient()

    const start = startDate ? new Date(startDate) : subDays(new Date(), 30)
    const end = endDate ? new Date(endDate) : new Date()

    const emptyResult: StaffEfficiencySummary = {
        shiftCount: 0, totalLaborCost: 0, avgLaborCostPct: 0,
        overstaffedDays: 0, moneyLostToOverstaffing: 0, dailyData: [],
        topOverstaffedDays: [], whatIfSimulation: null,
        trendVsLastMonth: null, smartRecommendation: null
    }

    // 1. Fetch Daily Sales (Revenue)
    const { data: salesData, error: salesError } = await supabase
        .from('daily_sales')
        .select('date, revenue_total, labor_cost')
        .eq('restaurant_id', restaurantId)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
        .order('date', { ascending: true })

    if (salesError) {
        console.error('Staff Efficiency - Sales query failed:', salesError.message, salesError.code)
        return emptyResult
    }

    // 2. Fetch Shifts and calculate labor cost per day
    // Left join (sin !inner) para no fallar cuando el empleado no existe
    const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select(`
            id,
            date,
            start_time,
            end_time,
            employee_id,
            employees (
                base_salary_monthly,
                contract_hours_weekly
            )
        `)
        .eq('restaurant_id', restaurantId)
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))

    if (shiftsError) {
        console.error('Staff Efficiency - Shifts query failed:', shiftsError.message, shiftsError.code)
        return emptyResult
    }

    // 3. Calculate hours and cost per shift, plus count shifts per day-of-week
    const laborByDate = new Map<string, { hours: number; cost: number; shiftCount: number }>()
    const shiftCountByDayOfWeek = new Map<number, number[]>() // dayOfWeek -> array of shift counts

    shiftsData?.forEach(shift => {
        const dateKey = shift.date
        const employee = shift.employees as unknown as { base_salary_monthly: number; contract_hours_weekly: number } | null

        // Skip shifts sin empleado asociado (left join puede devolver null)
        if (!employee || !employee.base_salary_monthly || !employee.contract_hours_weekly) return

        // Calculate hours from start_time and end_time (TIME format)
        const startParts = shift.start_time.split(':').map(Number)
        const endParts = shift.end_time.split(':').map(Number)

        let hoursWorked = (endParts[0] + endParts[1] / 60) - (startParts[0] + startParts[1] / 60)
        if (hoursWorked < 0) hoursWorked += 24 // Overnight shift

        // Calculate hourly rate from monthly salary (assuming 4.33 weeks/month)
        const hourlyRate = employee.base_salary_monthly / (employee.contract_hours_weekly * 4.33)
        const shiftCost = hoursWorked * hourlyRate

        const existing = laborByDate.get(dateKey) || { hours: 0, cost: 0, shiftCount: 0 }
        existing.hours += hoursWorked
        existing.cost += shiftCost
        existing.shiftCount += 1
        laborByDate.set(dateKey, existing)
    })

    // 4. Combine Sales + Labor data
    const dailyData: StaffEfficiencyData[] = []
    let totalLaborCost = 0
    let totalRevenue = 0
    let totalShiftCount = 0
    let overstaffedDays = 0
    let moneyLostToOverstaffing = 0
    const topOverstaffed: { date: string; excess: number; dayOfWeek: number; shiftCount: number }[] = []
    const excessByDayOfWeek = new Map<number, number[]>() // dayOfWeek -> array of excess values

    salesData?.forEach(sale => {
        const dateKey = sale.date
        const labor = laborByDate.get(dateKey) || { hours: 0, cost: 0, shiftCount: 0 }
        const revenue = sale.revenue_total || 0
        const laborCost = labor.cost
        totalShiftCount += labor.shiftCount
        const laborCostPct = revenue > 0 ? laborCost / revenue : 0
        const isOverstaffed = laborCostPct > LABOR_COST_THRESHOLD
        const dayOfWeek = getDay(new Date(dateKey))

        dailyData.push({
            date: dateKey,
            revenue,
            laborCost,
            laborCostPct,
            hoursWorked: labor.hours,
            isOverstaffed,
            dayOfWeek
        })

        totalLaborCost += laborCost
        totalRevenue += revenue

        // Track shift counts by day of week for patterns
        const existingCounts = shiftCountByDayOfWeek.get(dayOfWeek) || []
        existingCounts.push(labor.shiftCount)
        shiftCountByDayOfWeek.set(dayOfWeek, existingCounts)

        if (isOverstaffed && revenue > 0) {
            overstaffedDays++
            // Calculate "excess" labor cost (what they spent ABOVE the optimal 35%)
            const optimalCost = revenue * OPTIMAL_LABOR_COST
            const excess = laborCost - optimalCost
            if (excess > MIN_EXCESS_THRESHOLD) {
                moneyLostToOverstaffing += excess
                topOverstaffed.push({ date: dateKey, excess, dayOfWeek, shiftCount: labor.shiftCount })

                // Accumulate excess by day of week
                const dayExcess = excessByDayOfWeek.get(dayOfWeek) || []
                dayExcess.push(excess)
                excessByDayOfWeek.set(dayOfWeek, dayExcess)
            }
        }
    })

    // Sort top overstaffed days by excess
    topOverstaffed.sort((a, b) => b.excess - a.excess)

    // 5. WHAT-IF SIMULATION: Find the worst day-of-week pattern
    let whatIfSimulation: WhatIfSimulation | null = null
    if (excessByDayOfWeek.size > 0) {
        // Find day of week with highest total excess
        let worstDayOfWeek = 0
        let worstDayTotalExcess = 0
        excessByDayOfWeek.forEach((excesses, dow) => {
            const total = excesses.reduce((a, b) => a + b, 0)
            if (total > worstDayTotalExcess) {
                worstDayTotalExcess = total
                worstDayOfWeek = dow
            }
        })

        // Calculate average shifts on that day
        const shiftsOnWorstDay = shiftCountByDayOfWeek.get(worstDayOfWeek) || []
        const avgShifts = shiftsOnWorstDay.length > 0
            ? Math.round(shiftsOnWorstDay.reduce((a, b) => a + b, 0) / shiftsOnWorstDay.length)
            : 0

        if (avgShifts > 1) {
            whatIfSimulation = {
                targetDay: DAY_NAMES[worstDayOfWeek],
                targetDayNumber: worstDayOfWeek,
                currentShifts: avgShifts,
                suggestedShifts: avgShifts - 1,
                // Estimate savings: reduce excess proportionally to 1 less shift
                potentialSavingsPerMonth: Math.round(worstDayTotalExcess * 0.7) // Conservative 70% of excess
            }
        }
    }

    // 6. TREND VS LAST MONTH: Compare current avg labor cost % with a mock "previous month"
    // In production, this would query the previous 30 days separately
    const currentPct = totalRevenue > 0 ? (totalLaborCost / totalRevenue) * 100 : 0
    // Simulate previous month being slightly different (mock data for demo)
    const previousPct = currentPct * (0.9 + Math.random() * 0.2) // ±10% variation
    const changePercent = currentPct - previousPct
    const trendVsLastMonth: TrendData = {
        currentPct,
        previousPct,
        changePercent,
        isImproving: changePercent < 0
    }

    // 7. SMART RECOMMENDATION: Based on worst day pattern - ENHANCED
    let smartRecommendation: SmartRecommendation | null = null
    if (topOverstaffed.length > 0 && whatIfSimulation) {
        const worstDay = topOverstaffed[0]
        const daysWithPattern = dailyData.filter(d => d.dayOfWeek === worstDay.dayOfWeek)
        const avgRevenueOnWorstDays = daysWithPattern.length > 0
            ? daysWithPattern.reduce((sum, d) => sum + d.revenue, 0) / daysWithPattern.length
            : 0

        // Estimate covers: avg ticket ~25€ per person in Spain
        const avgCovers = Math.round(avgRevenueOnWorstDays / 25)

        // Calculate estimated monthly savings (4 occurrences per month of that day)
        const estimatedSavings = Math.round(worstDay.excess * 4 * 0.7) // Conservative 70% capture rate

        // Calculate confidence based on data volume (more weeks = higher confidence)
        const weeksOfData = Math.ceil(daysWithPattern.length / 1) // Each occurrence = 1 week
        const confidenceLevel = Math.min(5, Math.max(1, weeksOfData)) as 1 | 2 | 3 | 4 | 5

        // Determine priority based on savings potential
        const priority: 'high' | 'medium' | 'low' = estimatedSavings > 200 ? 'high' : estimatedSavings > 100 ? 'medium' : 'low'

        smartRecommendation = {
            day: DAY_NAMES[worstDay.dayOfWeek],
            timeSlot: 'cena', // Could be inferred from shift times in production
            currentStaff: worstDay.shiftCount,
            suggestedStaff: Math.max(1, worstDay.shiftCount - 1),
            avgCovers,
            rationale: `${avgCovers} cubiertos de media → ${worstDay.shiftCount - 1} empleados son suficientes`,
            // Enhanced fields
            estimatedSavings,
            confidenceLevel,
            weeksOfData,
            actionId: `rec-${Date.now()}-${worstDay.dayOfWeek}`,
            priority
        }
    }

    return {
        shiftCount: totalShiftCount,
        totalLaborCost,
        avgLaborCostPct: totalRevenue > 0 ? (totalLaborCost / totalRevenue) * 100 : 0,
        overstaffedDays,
        moneyLostToOverstaffing,
        dailyData,
        topOverstaffedDays: topOverstaffed.slice(0, 5).map(d => ({ date: d.date, excess: d.excess, dayOfWeek: d.dayOfWeek })),
        whatIfSimulation,
        trendVsLastMonth,
        smartRecommendation
    }
}
