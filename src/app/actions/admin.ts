'use server'

import { createClient } from "@/lib/supabaseServer"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "./admin-queries"

export async function toggleRestaurantModule(
    restaurantId: string,
    module: 'financial_control' | 'menu_engineering',
    level: 'none' | 'basic' | 'premium'
) {
    await requireAdmin()
    const supabase = await createClient()

    const { data: current, error: fetchError } = await supabase
        .from('restaurants')
        .select('modules')
        .eq('id', restaurantId)
        .single()

    if (fetchError) throw new Error("Restaurant not found")

    const updatedModules = {
        ...current.modules,
        [module]: level
    }

    const { error } = await supabase
        .from('restaurants')
        .update({ modules: updatedModules })
        .eq('id', restaurantId)

    if (error) {
        console.error("Error updating module:", error)
        throw new Error("Failed to update module")
    }

    revalidatePath('/admin')
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

    // Call the secure RPC function to delete the restaurant
    const { error } = await supabase.rpc('admin_delete_restaurant', {
        target_restaurant_id: restaurantId
    })

    if (error) {
        console.error("Error deleting restaurant:", error)
        throw new Error("Failed to delete restaurant")
    }

    revalidatePath('/admin')
    revalidatePath('/admin/restaurants')
    return { success: true }
}
