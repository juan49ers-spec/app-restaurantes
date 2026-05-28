'use server'

import { createClient } from "@/lib/supabaseServer"
import { startOfMonth, differenceInDays } from "date-fns"
import { FINANCIAL_THEME } from "@/lib/financial-theme"
import { PROJECTION_FACTORS, INFLATION_ESTIMATES } from "@/lib/financial-constants"

export interface DashboardMetrics {
    currentMonthSpend: number
    lastMonthSpend: number
    spendTrend: number
    inflationImpact: number
    activeAlerts: number
    spendByCategory: { name: string; value: number; color: string }[]
    dailySpend: { date: string; amount: number; cumulative: number; projected: boolean }[]
    recentAlerts: { id: string; type: string; title: string; message: string; created_at: string }[]
    topInflationaryItems: { name: string; priceChange: number; currentPrice: number }[]
    projections: {
        endOfMonthEstimate: number
    }
}

type PriceHistoryWithIngredientRow = {
    price: number
    date: string
    img?: { name: string } | { name: string }[] | null
}

export async function getFinancialMetrics(
    restaurantId: string,
    startDate?: string,
    endDate?: string
): Promise<DashboardMetrics> {
    const supabase = await createClient()
    const now = new Date()

    const startCurrent = startDate ? startDate : startOfMonth(now).toISOString()
    const endCurrent = endDate ? endDate : now.toISOString()

    const durationDays = differenceInDays(new Date(endCurrent), new Date(startCurrent))
    const startLast = new Date(new Date(startCurrent).getTime() - (durationDays * 24 * 60 * 60 * 1000)).toISOString()

    const [expensesResult, alertsResult] = await Promise.all([
        supabase
            .from('operating_expenses')
            .select('amount, expense_date, category')
            .eq('restaurant_id', restaurantId)
            .gte('expense_date', startLast)
            .lte('expense_date', endCurrent),
        supabase
            .from('alerts')
            .select('id, type, title, message, created_at')
            .eq('restaurant_id', restaurantId)
            .gte('created_at', startCurrent)
            .order('created_at', { ascending: false })
            .limit(20)
    ])

    const expenses = expensesResult.data || []
    const alerts = alertsResult.data || []

    const currentExpenses = expenses.filter(e => e.expense_date >= startCurrent)
    const lastExpenses = expenses.filter(e => e.expense_date >= startLast && e.expense_date < startCurrent)

    const currentMonthSpend = currentExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
    const lastMonthSpend = lastExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

    const spendTrend = lastMonthSpend > 0
        ? ((currentMonthSpend - lastMonthSpend) / lastMonthSpend) * 100
        : 100

    const categoryMap = new Map<string, number>()
    currentExpenses.forEach(exp => {
        const category = exp.category || 'OTHER'
        categoryMap.set(category, (categoryMap.get(category) || 0) + (Number(exp.amount) || 0))
    })

    const categoryColors: Record<string, string> = {
        'COGS_FOOD': FINANCIAL_THEME.colors.vegetables,
        'COGS_BEVERAGE': FINANCIAL_THEME.colors.beverage,
        'LABOR_PAYROLL': FINANCIAL_THEME.colors.meat,
        'LABOR_TAXES': FINANCIAL_THEME.colors.fish,
        'OCCUPANCY_RENT': FINANCIAL_THEME.colors.dryGoods,
        'OCCUPANCY_UTILITIES': FINANCIAL_THEME.colors.dairy,
        'MARKETING': '#8b5cf6',
        'MAINTENANCE': '#f59e0b',
        'PROFESSIONAL_SERVICES': '#06b6d4',
        'INSURANCE': '#10b981',
        'FINANCIAL': '#6366f1',
        'TECH': '#ec4899',
        'UNCATEGORIZED_CASH': '#64748b',
        'OTHER': FINANCIAL_THEME.colors.uncategorized
    }

    const spendByCategory = Array.from(categoryMap.entries()).map(([name, value]) => ({
        name,
        value,
        color: categoryColors[name] || FINANCIAL_THEME.colors.uncategorized
    })).sort((a, b) => b.value - a.value)

    const priceSpikeAlerts = alerts?.filter(a => a.type === 'PRICE_SPIKE') || []
    const inflationImpact = priceSpikeAlerts.length * INFLATION_ESTIMATES.PER_ALERT_IMPACT_EUR

    // 4. Daily Spend + Projection
    const dailyData = new Map<string, number>()
    currentExpenses.forEach(exp => {
        const dateKey = exp.expense_date
        dailyData.set(dateKey, (dailyData.get(dateKey) || 0) + (Number(exp.amount) || 0))
    })

    const chartData = []
    let cumulativeSpend = 0
    // Adjust start to date object to work with loop
    const loopStartDate = new Date(startCurrent)
    const loopEndDate = new Date(endCurrent)
    // Fix: loop condition needs care with dates, comparing time values
    for (let currentDate = new Date(loopStartDate); currentDate <= loopEndDate; currentDate.setDate(currentDate.getDate() + 1)) {
        const dateKey = currentDate.toISOString().split('T')[0]
        // If date is in future relative to "now", switch to projection
        const isFuture = currentDate > now

        let amount = 0
        if (!isFuture) {
            amount = dailyData.get(dateKey) || 0
            cumulativeSpend += amount
        } else {
            // Simple projection: Average daily spend * Weekend context
            // Protect against division by zero if day is 1
            const daysPassed = Math.max(1, now.getDate())
            const avgDaily = cumulativeSpend / daysPassed
            const isWeekend = currentDate.getDay() === 5 || currentDate.getDay() === 6 // Fri/Sat
            amount = avgDaily * (isWeekend ? PROJECTION_FACTORS.WEEKEND_MULTIPLIER : PROJECTION_FACTORS.WEEKDAY_MULTIPLIER)
            cumulativeSpend += amount
        }

        chartData.push({
            date: `${currentDate.getDate()}/${currentDate.getMonth() + 1}`,
            amount,
            cumulative: cumulativeSpend,
            projected: isFuture
        })
    }

    const endOfMonthEstimate = chartData.length > 0 ? chartData[chartData.length - 1].cumulative : currentMonthSpend

    // 5. Top Inflationary Items (From Price History)
    const { data: priceHistory } = await supabase
        .from('price_history')
        .select(`
            price,
            date,
            img:master_ingredients(name)
        `)
        .eq('master_ingredients.restaurant_id', restaurantId) // Assuming relation
        .gte('date', startLast)
        .order('date', { ascending: true })

    // Group by ingredient and calculate % change
    const ingredientTrends = new Map<string, { start: number, end: number, name: string }>()

    const priceHistoryRows = (priceHistory || []) as PriceHistoryWithIngredientRow[]
    priceHistoryRows.forEach(ph => {
        const ingredient = Array.isArray(ph.img) ? ph.img[0] : ph.img
        const name = ingredient?.name
        if (!name) return

        if (!ingredientTrends.has(name)) {
            ingredientTrends.set(name, { start: ph.price, end: ph.price, name })
        } else {
            const current = ingredientTrends.get(name)!
            current.end = ph.price
            // Keep start price as the earliest price in the period
        }
    })

    const topInflationaryItems = Array.from(ingredientTrends.values())
        .map(item => ({
            name: item.name,
            currentPrice: item.end,
            priceChange: ((item.end - item.start) / item.start) * 100
        }))
        .filter(i => i.priceChange > 0)
        .sort((a, b) => b.priceChange - a.priceChange)
        .slice(0, 5)

    return {
        currentMonthSpend,
        lastMonthSpend,
        spendTrend,
        inflationImpact,
        activeAlerts: priceSpikeAlerts.length,
        spendByCategory,
        dailySpend: chartData,
        recentAlerts: alerts?.slice(0, 5) || [],
        topInflationaryItems,
        projections: {
            endOfMonthEstimate
        }
    }
}
