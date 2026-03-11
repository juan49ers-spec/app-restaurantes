'use server'

import { createClient } from "@/lib/supabaseServer"
import { revalidatePath } from "next/cache"
import { EmployeeSchema, type Employee, ShiftSchema, type Shift } from "@/types/schema"

/**
 * EMPLOYEES
 */

export async function getEmployees(restaurantId: string): Promise<Employee[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('first_name', { ascending: true })

    if (error) throw error
    return data as Employee[]
}

export async function upsertEmployee(employee: Employee) {
    const supabase = await createClient()

    // Clean up empty ID for new employees
    const employeeData = { ...employee }
    if (!employeeData.id || employeeData.id === '') {
        delete (employeeData as { id?: string }).id
    }

    // Validate with Zod
    const validated = EmployeeSchema.parse(employeeData)

    const { data, error } = await supabase
        .from('employees')
        .upsert(validated)
        .select()
        .single()

    if (error) {
        console.error('Supabase upsertEmployee error:', error)
        throw new Error(`Error de base de datos: ${error.message} (código: ${error.code})`)
    }

    revalidatePath('/staff/employees')
    return data
}

export async function deleteEmployee(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)

    if (error) throw error

    revalidatePath('/staff/employees')
}

/**
 * SHIFTS
 */

export async function getShifts(restaurantId: string, startDate: string, endDate: string): Promise<Pick<Shift, 'id' | 'employee_id' | 'date' | 'start_time' | 'end_time' | 'estimated_cost' | 'actual_cost'>[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('shifts')
        .select('id, employee_id, date, start_time, end_time, estimated_cost, actual_cost')
        .eq('restaurant_id', restaurantId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

    if (error) throw error
    return data as Pick<Shift, 'id' | 'employee_id' | 'date' | 'start_time' | 'end_time' | 'estimated_cost' | 'actual_cost'>[]
}

export async function upsertShift(shift: Shift) {
    const supabase = await createClient()

    const validated = ShiftSchema.parse(shift)

    const { data, error } = await supabase
        .from('shifts')
        .upsert(validated)
        .select()
        .single()

    if (error) throw error

    revalidatePath('/staff/schedule')
    return data
}

export async function deleteShift(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', id)

    if (error) throw error

    revalidatePath('/staff/schedule')
}

/**
 * STAFFING INTELLIGENCE
 */

export interface DailyForecast {
    date: string
    projectedSales: number
    actualSales: number | null
    laborCost: number
    laborHours: number
    targetLaborCostPct: number
    status: 'OPTIMAL' | 'OVERSTAFFED' | 'UNDERSTAFFED'
    efficiency: number // (Labor / Sales) * 100
}

export async function getStaffingForecast(restaurantId: string, startDate: string, endDate: string): Promise<DailyForecast[]> {
    const supabase = await createClient()

    // 1. Fetch Scheduled Shifts for the period
    const { data: shifts } = await supabase
        .from('shifts')
        .select('id, date, start_time, end_time, estimated_cost')
        .eq('restaurant_id', restaurantId)
        .gte('date', startDate)
        .lte('date', endDate)

    // 2. Fetch Actual Sales for the period (if any)
    const { data: actualSales } = await supabase
        .from('daily_sales')
        .select('date, revenue_total')
        .eq('restaurant_id', restaurantId)
        .gte('date', startDate)
        .lte('date', endDate)

    // 3. Fetch Monthly Target (Labor Cost %)
    // Extract YYYY-MM from startDate
    const monthYear = startDate.substring(0, 7)
    const { data: target } = await supabase
        .from('monthly_targets')
        .select('labor_target_pct')
        .eq('restaurant_id', restaurantId)
        .eq('month_year', monthYear)
        .single()

    const targetPct = target?.labor_target_pct || 30 // Default to 30% if not set

    // 4. Calculate Forecast (4-week rolling average for future dates)
    const startObj = new Date(startDate)
    const endObj = new Date(endDate)
    const days: DailyForecast[] = []

    // Fetch Historical Sales for Forecasting (Start - 30 days)
    const historyStart = new Date(startObj)
    historyStart.setDate(historyStart.getDate() - 30)
    const historyStartStr = historyStart.toISOString().split('T')[0]

    // We fetch broader history to be safe
    const { data: historySales } = await supabase
        .from('daily_sales')
        .select('date, revenue_total')
        .eq('restaurant_id', restaurantId)
        .gte('date', historyStartStr)
        .lt('date', startDate) // Only strictly past data

    for (let d = new Date(startObj); d <= endObj; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]

        // Find actual sales (if date is in past/today and has data)
        const actual = actualSales?.find(s => s.date === dateStr)

        let projected = 0

        if (actual) {
            projected = actual.revenue_total
        } else {
            // Forecast: Get average of same day of week for last 4 weeks
            const dayOfWeek = d.getDay()
            const relevant = historySales?.filter(h => new Date(h.date).getDay() === dayOfWeek) || []

            if (relevant.length > 0) {
                const total = relevant.reduce((acc, curr) => acc + curr.revenue_total, 0)
                projected = total / relevant.length
            } else {
                projected = 0 // No history, default to 0
            }
        }

        const dayShifts = shifts?.filter(s => s.date === dateStr) || []
        const laborCost = dayShifts.reduce((acc, s) => acc + (s.estimated_cost || 0), 0)

        // Calculate Hours
        const laborHours = dayShifts.reduce((acc, s) => {
            const start = parseInt(s.start_time.split(':')[0]) + parseInt(s.start_time.split(':')[1]) / 60
            const end = parseInt(s.end_time.split(':')[0]) + parseInt(s.end_time.split(':')[1]) / 60
            return acc + (end - start)
        }, 0)

        // Efficiency
        // Use projected if actual is null
        const salesBase = actual ? actual.revenue_total : (projected || 1) // Avoid div/0, default 1 if 0 to show 0 efficiency not Inf
        const efficiency = salesBase > 1 ? (laborCost / salesBase) * 100 : 0

        let status: DailyForecast['status'] = 'OPTIMAL'
        if (efficiency > targetPct + 5) status = 'OVERSTAFFED'
        else if (efficiency < targetPct - 5 && efficiency > 0) status = 'UNDERSTAFFED'
        else status = 'OPTIMAL'

        days.push({
            date: dateStr,
            projectedSales: projected,
            actualSales: actual ? actual.revenue_total : null,
            laborCost,
            laborHours,
            targetLaborCostPct: targetPct,
            status,
            efficiency
        })
    }

    return days
}
