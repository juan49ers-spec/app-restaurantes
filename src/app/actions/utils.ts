'use server'

import { createClient } from "@/lib/supabaseServer"
import { isAdminEmail } from "@/lib/admin-emails"
import { redirect } from "next/navigation"

async function getOptionalCookieValue(name: string) {
    try {
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        return cookieStore.get(name)?.value ?? null
    } catch {
        return null
    }
}

async function clearOptionalCookie(name: string) {
    try {
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        cookieStore.delete(name)
    } catch {
        // Cookie access is unavailable in some test/runtime contexts; ignoring keeps the resolver non-blocking.
    }
}

export async function getUserRestaurant(): Promise<string | null> {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        redirect('/login')
    }

    // --- IMPERSONATION LOGIC ---
    // Only super admins can impersonate a restaurant.
    if (isAdminEmail(user.email)) {
        const impersonatedId = await getOptionalCookieValue('impersonated_restaurant_id')
        if (impersonatedId) {
            return impersonatedId
        }
    }

    const activeConsultantRestaurantId = await getOptionalCookieValue('active_consultant_restaurant_id')
    if (activeConsultantRestaurantId) {
        const { data: consultantLink } = await supabase
            .from('consultant_restaurants')
            .select('restaurant_id')
            .eq('consultant_user_id', user.id)
            .eq('restaurant_id', activeConsultantRestaurantId)
            .eq('status', 'ACTIVE')
            .maybeSingle()

        if (consultantLink) return activeConsultantRestaurantId
        await clearOptionalCookie('active_consultant_restaurant_id')
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
