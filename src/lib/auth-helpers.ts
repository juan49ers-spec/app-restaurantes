import { cache } from "react"
import { createClient } from "@/lib/supabaseServer"
import { redirect } from "next/navigation"

// React.cache() deduplicates within the same server request
export const getRestaurant = cache(async () => {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: restaurant } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle()

    return restaurant
})

export async function requireRestaurant() {
    const restaurant = await getRestaurant()
    if (!restaurant) {
        redirect('/onboarding')
    }
    return restaurant
}

