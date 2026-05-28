'use server'

import { createActionLogger } from '@/lib/logger'
import { createClient } from "@/lib/supabaseServer"
import { revalidatePath } from "next/cache"
import { Shift } from "@/types/schema"
import { getUserRestaurant } from "./utils"

const log = createActionLogger('staff-scheduling')


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

export async function getStaffingForecast(_restaurantId: string, startDate: string, endDate: string): Promise<DailyForecast[]> {
    try {
        const supabase = await createClient()
        const activeRestaurantId = await getUserRestaurant()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error("No autorizado.")
        if (!activeRestaurantId) throw new Error("No hay restaurante activo.")

        // 1. Fetch Scheduled Shifts for the period
        const { data: shifts } = await supabase
            .from('shifts')
            .select('*')
            .eq('restaurant_id', activeRestaurantId)
            .gte('date', startDate)
            .lte('date', endDate)

        // 2. Fetch Actual Sales for the period (if any)
        const { data: actualSales } = await supabase
            .from('daily_sales')
            .select('date, revenue_total')
            .eq('restaurant_id', activeRestaurantId)
            .gte('date', startDate)
            .lte('date', endDate)

        // 3. Fetch Monthly Target (Labor Cost %)
        const monthYear = startDate.substring(0, 7)
        const { data: target } = await supabase
            .from('monthly_targets')
            .select('labor_target_pct')
            .eq('restaurant_id', activeRestaurantId)
            .eq('month_year', monthYear)
            .single()

        const targetPct = target?.labor_target_pct || 30

        // 4. Calculate Forecast 
        const startObj = new Date(startDate)
        const endObj = new Date(endDate)
        const days: DailyForecast[] = []

        // Fetch Historical Sales for Forecasting
        const historyStart = new Date(startObj)
        historyStart.setDate(historyStart.getDate() - 30)
        const historyStartStr = historyStart.toISOString().split('T')[0]

        const { data: historySales } = await supabase
            .from('daily_sales')
            .select('date, revenue_total')
            .eq('restaurant_id', activeRestaurantId)
            .gte('date', historyStartStr)
            .lt('date', startDate)

        for (let d = new Date(startObj); d <= endObj; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0]
            const actual = actualSales?.find(s => s.date === dateStr)
            let projected = 0

            if (actual) {
                projected = actual.revenue_total
            } else {
                const dayOfWeek = d.getDay()
                const relevant = historySales?.filter(h => new Date(h.date).getDay() === dayOfWeek) || []
                if (relevant.length > 0) {
                    const total = relevant.reduce((acc, curr) => acc + curr.revenue_total, 0)
                    projected = total / relevant.length
                }
            }

            const dayShifts = shifts?.filter(s => s.date === dateStr) || []
            const laborCost = dayShifts.reduce((acc, s) => acc + (s.estimated_cost || 0), 0)

            const laborHours = dayShifts.reduce((acc, s) => {
                const start = parseInt(s.start_time.split(':')[0]) + parseInt(s.start_time.split(':')[1]) / 60
                const end = parseInt(s.end_time.split(':')[0]) + parseInt(s.end_time.split(':')[1]) / 60
                return acc + (end - start)
            }, 0)

            const salesBase = actual ? actual.revenue_total : (projected || 1)
            const efficiency = salesBase > 1 ? (laborCost / salesBase) * 100 : 0

            let status: DailyForecast['status'] = 'OPTIMAL'
            if (efficiency > targetPct + 5) status = 'OVERSTAFFED'
            else if (efficiency < targetPct - 5 && efficiency > 0) status = 'UNDERSTAFFED'

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
    } catch (err) {
        log.error({ err }, "Error in getStaffingForecast")
        return []
    }
}

export async function getShifts(_restaurantId: string, startDate: string, endDate: string): Promise<{ data: Shift[] | null; error: string | null }> {
    try {
        const supabase = await createClient()
        const activeRestaurantId = await getUserRestaurant()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { data: null, error: "No autorizado." }
        if (!activeRestaurantId) return { data: null, error: "No hay restaurante activo." }

        const { data, error } = await supabase
            .from("shifts")
            .select("*, employees!inner(first_name, last_name, color_code, role)")
            .eq("restaurant_id", activeRestaurantId)
            .gte("date", startDate)
            .lte("date", endDate)
            .order("date", { ascending: true })
            .order("start_time", { ascending: true })

        if (error) {
            log.error({ err: error }, "Error fetching shifts")
            return { data: null, error: "No se pudieron cargar los turnos." }
        }

        return { data: data as Shift[], error: null }
    } catch (err) {
        log.error({ err }, "Unexpected error in getShifts")
        return { data: null, error: "Error inesperado." }
    }
}

export async function upsertShift(shift: Partial<Shift>): Promise<{ success: boolean; data: Shift | null; error: string | null }> {
    try {
        const supabase = await createClient()
        const restaurantId = await getUserRestaurant()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { success: false, data: null, error: "No autorizado." }

        if (!restaurantId || !shift.employee_id) {
            return { success: false, data: null, error: "Faltan datos obligatorios del turno." }
        }

        const { restaurant_id: _ignoredRestaurantId, ...safeShift } = shift

        const { data, error } = await supabase
            .from("shifts")
            .upsert({ ...safeShift, restaurant_id: restaurantId })
            .select()
            .single()

        if (error) {
            log.error({ err: error }, "Error upserting shift")
            return { success: false, data: null, error: "No se pudo guardar el turno." }
        }

        revalidatePath("/staff/schedule")
        return { success: true, data: data as Shift, error: null }
    } catch (err) {
        log.error({ err }, "Unexpected error in upsertShift")
        return { success: false, data: null, error: "Error inesperado." }
    }
}

export async function deleteShift(shiftId: string): Promise<{ success: boolean; error: string | null }> {
    try {
        const supabase = await createClient()
        const restaurantId = await getUserRestaurant()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { success: false, error: "No autorizado." }
        if (!restaurantId) return { success: false, error: "No hay restaurante activo." }

        const { error } = await supabase
            .from("shifts")
            .delete()
            .eq("id", shiftId)
            .eq("restaurant_id", restaurantId)

        if (error) {
            log.error({ err: error }, "Error deleting shift")
            return { success: false, error: "No se pudo eliminar el turno." }
        }

        revalidatePath("/staff/schedule")
        return { success: true, error: null }
    } catch (err) {
        log.error({ err }, "Unexpected error in deleteShift")
        return { success: false, error: "Error inesperado." }
    }
}
