'use server'

import { createClient } from "@/lib/supabaseServer"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "./admin-queries"

export async function toggleRestaurantModule(
    restaurantId: string,
    module: 'financial_control' | 'operativa' | 'proveedores' | 'personal',
    level: 'none' | 'basic' | 'premium'
) {
    await requireAdmin()
    const supabase = await createClient()

    const { data: current, error: fetchError } = await supabase
        .from('restaurants')
        .select('modules, active_addons')
        .eq('id', restaurantId)
        .single()

    if (fetchError) throw new Error("Restaurant not found")

    const updatedModules = {
        ...current.modules,
        [module]: level
    }

    // Sincronizar active_addons basado en los módulos activos
    // Cada addon corresponde a módulos específicos del sidebar
    const activeAddons: string[] = []
    const isActive = (mod: string) => {
        const val = updatedModules[mod]
        return val === 'basic' || val === 'premium'
    }
    if (isActive('operativa')) activeAddons.push('operativa')
    if (isActive('proveedores')) activeAddons.push('proveedores')
    if (isActive('personal')) activeAddons.push('personal')

    const { error } = await supabase
        .from('restaurants')
        .update({
            modules: updatedModules,
            active_addons: activeAddons
        })
        .eq('id', restaurantId)

    if (error) {
        console.error("Error updating module:", error)
        throw new Error("Failed to update module")
    }

    revalidatePath('/admin')
    revalidatePath('/', 'layout')
    return { success: true }
}

export async function updateUserRestaurant(
    userId: string,
    restaurantId: string | null
) {
    await requireAdmin()
    const supabase = await createClient()

    const { error } = await supabase.rpc('admin_update_user_restaurant', {
        target_user_id: userId,
        new_restaurant_id: restaurantId
    })

    if (error) {
        console.error("Error updating user restaurant:", error)
        throw new Error("Failed to update user restaurant")
    }

    revalidatePath('/admin/users')
    return { success: true }
}

export async function deleteRestaurant(restaurantId: string) {
    await requireAdmin()
    const supabase = await createClient()

    // Call the cascading RPC function to safely delete the restaurant and all its related records
    console.log(`[Admin Delete] Intentando eliminar restaurante: ${restaurantId}`)
    const { error } = await supabase.rpc('admin_delete_restaurant_cascade', {
        target_restaurant_id: restaurantId
    })

    if (error) {
        console.error("=== ERROR COMPLETO DELETE RESTAURANT ===")
        console.error("Code:", error.code)
        console.error("Message:", error.message)
        console.error("Details:", error.details)
        console.error("Hint:", error.hint)
        console.error("Full error object:", JSON.stringify(error, null, 2))
        console.error("========================================")
        throw new Error(`No se pudo eliminar: [${error.code}] ${error.message}`)
    }

    revalidatePath('/admin')
    revalidatePath('/admin/restaurants')
    return { success: true }
}
