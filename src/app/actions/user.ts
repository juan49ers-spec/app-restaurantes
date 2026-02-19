'use server'

import { createClient } from "@/lib/supabaseServer"

export async function getCurrentRestaurant() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Fetch the first restaurant owned by user
    const { data: restaurant } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle()

    return restaurant
}
