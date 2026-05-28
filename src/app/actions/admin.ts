'use server'

import { createActionLogger } from '@/lib/logger'
import { createClient } from "@/lib/supabaseServer"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "./admin-queries"

const log = createActionLogger('admin')

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
        log.error({ err: error }, "Error updating module")
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
        log.error({ err: error }, "Error updating user restaurant")
        throw new Error("Failed to update user restaurant")
    }

    revalidatePath('/admin/users')
    return { success: true }
}

export async function deleteRestaurant(restaurantId: string) {
    await requireAdmin()
    const supabase = await createClient()

    // Call the cascading RPC function to safely delete the restaurant and all its related records
    log.info({ restaurantId }, "Attempting to delete restaurant")
    const { error } = await supabase.rpc('admin_delete_restaurant_cascade', {
        target_restaurant_id: restaurantId
    })

    if (error) {
        log.error({ err: error, restaurantId, code: error.code, details: error.details, hint: error.hint }, "Error deleting restaurant")
        throw new Error(`No se pudo eliminar: [${error.code}] ${error.message}`)
    }

    revalidatePath('/admin')
    revalidatePath('/admin/restaurants')
    return { success: true }
}
