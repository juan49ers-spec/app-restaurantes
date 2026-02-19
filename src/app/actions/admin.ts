'use server'

import { createClient } from "@/lib/supabaseServer"
import { revalidatePath } from "next/cache"

const ADMIN_EMAILS = ['juan49ers@gmail.com', 'admin@controlhub.com']

async function requireAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email || !ADMIN_EMAILS.includes(user.email)) {
        throw new Error("Unauthorized: Super Admin access required")
    }
    return user
}

export async function getAllRestaurants() {
    await requireAdmin()
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching restaurants:", error)
        throw new Error("Failed to fetch restaurants")
    }

    return data
}

export async function toggleRestaurantModule(
    restaurantId: string,
    module: 'financial_control' | 'menu_engineering',
    level: 'none' | 'basic' | 'premium'
) {
    await requireAdmin()
    const supabase = await createClient()

    // First get current modules
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
