import { createClient } from "@/lib/supabaseServer"
import { redirect } from "next/navigation"

export async function getRestaurant() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Fetch the first restaurant owned by user
    // In future: support multiple or use profile.active_restaurant_id
    const { data: restaurant } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle()

    return restaurant
}

export async function requireRestaurant() {
    const restaurant = await getRestaurant()
    if (!restaurant) {
        redirect('/onboarding')
    }
    return restaurant
}
