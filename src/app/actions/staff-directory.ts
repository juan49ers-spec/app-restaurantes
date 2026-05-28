'use server'

import { createActionLogger } from '@/lib/logger'
import { createClient } from "@/lib/supabaseServer"
import { revalidatePath } from "next/cache"
import { Employee } from "@/types/schema"
import { getUserRestaurant } from "./utils"

const log = createActionLogger('staff-directory')


export async function getEmployees(): Promise<{ data: Employee[] | null; error: string | null }> {
    try {
        const supabase = await createClient()
        const restaurantId = await getUserRestaurant()

        // 🛡️ Vercel Best Practice: Authenticate Server Actions
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { data: null, error: "No autorizado." }
        }

        if (!restaurantId) {
            return { data: null, error: "No hay restaurante activo." }
        }

        const { data, error } = await supabase
            .from("employees")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .order("first_name", { ascending: true })

        if (error) {
            log.error({ err: error }, "Error fetching employees")
            return { data: null, error: "No se pudieron cargar los empleados." }
        }

        return { data: data as Employee[], error: null }
    } catch (err) {
        log.error({ err }, "Unexpected error in getEmployees")
        return { data: null, error: "Error inesperado al cargar empleados." }
    }
}

export async function upsertEmployee(employee: Partial<Employee>): Promise<{ success: boolean; data: Employee | null; error: string | null }> {
    try {
        const supabase = await createClient()
        const restaurantId = await getUserRestaurant()

        // 🛡️ Vercel Best Practice: Authenticate Server Actions
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, data: null, error: "No autorizado para modificar personal." }
        }

        if (!restaurantId) {
            return { success: false, data: null, error: "Faltan datos de restaurante." }
        }

        const { restaurant_id: _ignoredRestaurantId, ...safeEmployee } = employee

        const { data, error } = await supabase
            .from("employees")
            .upsert({ ...safeEmployee, restaurant_id: restaurantId })
            .select()
            .single()

        if (error) {
            log.error({ err: error }, "Error upserting employee")
            return { success: false, data: null, error: "No se pudo guardar el empleado." }
        }

        revalidatePath("/staff/employees")
        revalidatePath("/staff/schedule")

        return { success: true, data: data as Employee, error: null }
    } catch (err) {
        log.error({ err }, "Unexpected error in upsertEmployee")
        return { success: false, data: null, error: "Error inesperado al guardar el empleado." }
    }
}

export async function toggleEmployeeStatus(employeeId: string, currentStatus: string): Promise<{ success: boolean; error: string | null }> {
    try {
        const supabase = await createClient()
        const restaurantId = await getUserRestaurant()

        // 🛡️ Vercel Best Practice: Authenticate Server Actions
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: "No autorizado." }
        }

        if (!restaurantId) {
            return { success: false, error: "No hay restaurante activo." }
        }

        const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'

        const { error } = await supabase
            .from("employees")
            .update({ status: newStatus })
            .eq("id", employeeId)
            .eq("restaurant_id", restaurantId) // Double verify access via restaurant

        if (error) {
            log.error({ err: error }, "Error toggling employee status")
            return { success: false, error: "No se pudo cambiar el estado." }
        }

        revalidatePath("/staff/employees")
        return { success: true, error: null }
    } catch (err) {
        log.error({ err }, "Unexpected error in toggleEmployeeStatus")
        return { success: false, error: "Error inesperado." }
    }
}

export async function deleteEmployee(employeeId: string): Promise<{ success: boolean; error: string | null }> {
    try {
        const supabase = await createClient()
        const restaurantId = await getUserRestaurant()

        // 🛡️ Vercel Best Practice: Authenticate Server Actions
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: "No autorizado." }
        }

        if (!restaurantId) {
            return { success: false, error: "No hay restaurante activo." }
        }

        // Se usa hard delete aquí, pero el soft delete se realiza con toggleEmployeeStatus hacia INACTIVE. 
        // Esta función se mantiene por si el dueño quiere borrar el registro por completo.
        const { error } = await supabase
            .from("employees")
            .delete()
            .eq("id", employeeId)
            .eq("restaurant_id", restaurantId)

        if (error) {
            log.error({ err: error }, "Error deleting employee")
            return { success: false, error: "Error al eliminar ficha del empleado. Es posible que tenga turnos asignados." }
        }

        revalidatePath("/staff/employees")
        return { success: true, error: null }
    } catch (err) {
        log.error({ err }, "Unexpected error in deleteEmployee")
        return { success: false, error: "Error inesperado." }
    }
}

// ==========================================
// SHIFTS
