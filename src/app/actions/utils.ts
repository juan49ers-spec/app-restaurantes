'use server'

import { createClient } from "@/lib/supabaseServer"
import { redirect } from "next/navigation"

export async function getUserRestaurant(): Promise<string | null> {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        redirect('/login')
    }

    // --- IMPERSONATION LOGIC ---
    // Only super admins can impersonate a restaurant.
    const ADMIN_EMAILS = ['juan49ers@gmail.com', 'admin@controlhub.com']
    if (user.email && ADMIN_EMAILS.includes(user.email.trim().toLowerCase())) {
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        const impersonatedId = cookieStore.get('impersonated_restaurant_id')?.value
        if (impersonatedId) {
            return impersonatedId
        }
    }

    // 1. Query DB for restaurant owned by this user
    const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle()

    if (restaurant) return restaurant.id

    // 2. Check metadata fallback (e.g. user assigned to restaurant by admin)
    const metadataId = user.user_metadata?.restaurant_id
    if (metadataId) return metadataId as string

    // 3. No restaurant found — admin users or new users without restaurant
    return null
}
