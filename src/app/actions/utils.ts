'use server'

import { createClient } from "@/lib/supabaseServer"
import { redirect } from "next/navigation"

export async function getUserRestaurant() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        redirect('/login')
    }

    // 1. Try to get from metadata (Fastest)
    // CRITICAL: DISABLED to prevent mismatch with Server Components which use DB directly.
    // If metadata gets stale (e.g. user changes active restaurant), writes go to wrong ID.
    // const metadataId = user.user_metadata?.restaurant_id
    // if (metadataId) return metadataId

    // 2. Fallback: Query DB (If trigger failed or old user)
    const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle()

    if (restaurant) return restaurant.id

    // 3. Fallback: Create if strictly needed (Safety net)
    // For now, throw error to enforce cleaner logic
    throw new Error("No restaurant found for user. Please contact support.")
}
