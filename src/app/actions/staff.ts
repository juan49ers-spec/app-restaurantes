"use server"

import { createClient } from "@/lib/supabaseServer"
import { revalidatePath } from "next/cache"
import { Employee, Shift } from "@/types/schema"

// ==========================================
// EMPLOYEES
// ==========================================

export async function getEmployees(restaurantId: string): Promise<{ data: Employee[] | null; error: string | null }> {
    try {
        const supabase = await createClient()

        // 🛡️ Vercel Best Practice: Authenticate Server Actions
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { data: null, error: "No autorizado." }
        }

        const { data, error } = await supabase
            .from("employees")
            .select("id, first_name, last_name, role, status, color_code, hourly_rate")
            .eq("restaurant_id", restaurantId)
            .order("first_name", { ascending: true })

        if (error) {
            console.error("Error fetching employees:", error)
            return { data: null, error: "No se pudieron cargar los empleados." }
        }

        return { data: (data || []) as unknown as Employee[], error: null }
    } catch (err) {
        console.error("Unexpected error in getEmployees:", err)
        return { data: null, error: "Error inesperado al cargar empleados." }
    }
}

export async function upsertEmployee(employee: Partial<Employee>): Promise<{ success: boolean; data: Employee | null; error: string | null }> {
    try {
        const supabase = await createClient()

        // 🛡️ Vercel Best Practice: Authenticate Server Actions
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, data: null, error: "No autorizado para modificar personal." }
        }

        if (!employee.restaurant_id) {
            return { success: false, data: null, error: "Faltan datos de restaurante." }
        }

        const { data, error } = await supabase
            .from("employees")
            .upsert(employee)
            .select()
            .single()

        if (error) {
            console.error("Error upserting employee:", error)
            return { success: false, data: null, error: "No se pudo guardar el empleado." }
        }

        revalidatePath("/staff/employees")
        revalidatePath("/staff/schedule")

        return { success: true, data: data as Employee, error: null }
    } catch (err) {
        console.error("Unexpected error in upsertEmployee:", err)
        return { success: false, data: null, error: "Error inesperado al guardar el empleado." }
    }
}

export async function toggleEmployeeStatus(employeeId: string, currentStatus: string, restaurantId: string): Promise<{ success: boolean; error: string | null }> {
    try {
        const supabase = await createClient()

        // 🛡️ Vercel Best Practice: Authenticate Server Actions
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: "No autorizado." }
        }

        const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'

        const { error } = await supabase
            .from("employees")
            .update({ status: newStatus })
            .eq("id", employeeId)
            .eq("restaurant_id", restaurantId) // Double verify access via restaurant

        if (error) {
            console.error("Error toggling employee status:", error)
            return { success: false, error: "No se pudo cambiar el estado." }
        }

        revalidatePath("/staff/employees")
        return { success: true, error: null }
    } catch (err) {
        console.error("Unexpected error in toggleEmployeeStatus:", err)
        return { success: false, error: "Error inesperado." }
    }
}

export async function deleteEmployee(employeeId: string, restaurantId: string): Promise<{ success: boolean; error: string | null }> {
    try {
        const supabase = await createClient()

        // 🛡️ Vercel Best Practice: Authenticate Server Actions
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: "No autorizado." }
        }

        // Se usa hard delete aquí, pero el soft delete se realiza con toggleEmployeeStatus hacia INACTIVE. 
        // Esta función se mantiene por si el dueño quiere borrar el registro por completo.
        const { error } = await supabase
            .from("employees")
            .delete()
            .eq("id", employeeId)
            .eq("restaurant_id", restaurantId)

        if (error) {
            console.error("Error deleting employee:", error)
            return { success: false, error: "Error al eliminar ficha del empleado. Es posible que tenga turnos asignados." }
        }

        revalidatePath("/staff/employees")
        return { success: true, error: null }
    } catch (err) {
        console.error("Unexpected error in deleteEmployee:", err)
        return { success: false, error: "Error inesperado." }
    }
}

// ==========================================
// SHIFTS
// ==========================================

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
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error("No autorizado.")

        // 1. Fetch Scheduled Shifts for the period
        const { data: shifts } = await supabase
            .from('shifts')
            .select('id, date, start_time, end_time, estimated_cost, employee_id')
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
        const monthYear = startDate.substring(0, 7)
        const { data: target } = await supabase
            .from('monthly_targets')
            .select('labor_target_pct')
            .eq('restaurant_id', restaurantId)
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
            .eq('restaurant_id', restaurantId)
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

        return (days || []) as unknown as DailyForecast[]
    } catch (err) {
        console.error("Error in getStaffingForecast:", err)
        return []
    }
}

export async function getShifts(restaurantId: string, startDate: string, endDate: string): Promise<{ data: Shift[] | null; error: string | null }> {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { data: null, error: "No autorizado." }

        const { data, error } = await supabase
            .from("shifts")
            .select("id, date, start_time, end_time, estimated_cost, employee_id, employees!inner(first_name, last_name, color_code, role)")
            .eq("restaurant_id", restaurantId)
            .gte("date", startDate)
            .lte("date", endDate)
            .order("date", { ascending: true })
            .order("start_time", { ascending: true })

        if (error) {
            console.error("Error fetching shifts:", error)
            return { data: null, error: "No se pudieron cargar los turnos." }
        }

        return { data: (data || []) as unknown as Shift[], error: null }
    } catch (err) {
        console.error("Unexpected error in getShifts:", err)
        return { data: null, error: "Error inesperado." }
    }
}

export async function upsertShift(shift: Partial<Shift>): Promise<{ success: boolean; data: Shift | null; error: string | null }> {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { success: false, data: null, error: "No autorizado." }

        if (!shift.restaurant_id || !shift.employee_id) {
            return { success: false, data: null, error: "Faltan datos obligatorios del turno." }
        }

        const { data, error } = await supabase
            .from("shifts")
            .upsert(shift)
            .select()
            .single()

        if (error) {
            console.error("Error upserting shift:", error)
            return { success: false, data: null, error: "No se pudo guardar el turno." }
        }

        revalidatePath("/staff/schedule")
        return { success: true, data: data as Shift, error: null }
    } catch (err) {
        console.error("Unexpected error in upsertShift:", err)
        return { success: false, data: null, error: "Error inesperado." }
    }
}

export async function deleteShift(shiftId: string, restaurantId: string): Promise<{ success: boolean; error: string | null }> {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { success: false, error: "No autorizado." }

        const { error } = await supabase
            .from("shifts")
            .delete()
            .eq("id", shiftId)
            .eq("restaurant_id", restaurantId)

        if (error) {
            console.error("Error deleting shift:", error)
            return { success: false, error: "No se pudo eliminar el turno." }
        }

        revalidatePath("/staff/schedule")
        return { success: true, error: null }
    } catch (err) {
        console.error("Unexpected error in deleteShift:", err)
        return { success: false, error: "Error inesperado." }
    }
}
