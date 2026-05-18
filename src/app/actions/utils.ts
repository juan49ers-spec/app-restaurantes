'use server'

import { createClient } from "@/lib/supabaseServer"
import { redirect } from "next/navigation"
import { getAdminEmailList } from "@/lib/admin"
import { logAuditEvent } from "@/lib/audit"

export async function getUserRestaurant(): Promise<string | null> {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        redirect('/login')
    }

    // --- IMPERSONATION LOGIC ---
    const adminEmails = getAdminEmailList()
    if (user.email && adminEmails.includes(user.email.trim().toLowerCase())) {
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        const impersonatedId = cookieStore.get('impersonated_restaurant_id')?.value
        if (impersonatedId) {
            const { data: restaurant } = await supabase
                .from('restaurants')
                .select('id')
                .eq('id', impersonatedId)
                .maybeSingle()

            if (!restaurant) {
                cookieStore.delete('impersonated_restaurant_id')
                cookieStore.delete('impersonated_restaurant_name')
                await logAuditEvent({
                    action: 'impersonation_invalid',
                    target_type: 'restaurant',
                    target_id: impersonatedId,
                    metadata: { reason: 'restaurant_not_found', admin_email: user.email }
                })
                return null
            }

            return restaurant.id
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

    // 3. No restaurant found
    return null
}
