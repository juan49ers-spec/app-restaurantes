import { createClient } from "@/lib/supabaseServer"
import { getAdminEmailList } from "@/lib/admin"

export async function verifyRestaurantAccess(restaurantId: string): Promise<void> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Authentication required")
    }

    // Admins with impersonation can access any restaurant
    const adminEmails = getAdminEmailList()
    if (user.email && adminEmails.includes(user.email.trim().toLowerCase())) {
        return
    }

    // Regular users: verify ownership
    const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('id', restaurantId)
        .eq('owner_id', user.id)
        .maybeSingle()

    if (!restaurant) {
        // Check metadata fallback
        const metadataId = user.user_metadata?.restaurant_id
        if (metadataId === restaurantId) return

        throw new Error("Access denied: you do not own this restaurant")
    }
}
