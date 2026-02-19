import { createClient } from "@/lib/supabaseServer"
import { requireRestaurant } from "@/lib/auth-helpers"
import { getRecipes } from "@/app/actions/recipes"
import { EscandallosClient } from "./client"

export const dynamic = 'force-dynamic'

export default async function EscandallosPage() {
    const restaurant = await requireRestaurant()

    const supabase = await createClient()
    const [{ data: ingredients, error }, recipes] = await Promise.all([
        supabase
            .from('master_ingredients')
            .select('*')
            .eq('restaurant_id', restaurant.id)
            .order('name'),
        getRecipes()
    ])

    if (error) {
        return <div className="p-8 text-destructive">Error: {error.message}</div>
    }

    return (
        <div className="container mx-auto py-8 space-y-6 animate-in fade-in duration-500">
            <EscandallosClient
                initialIngredients={ingredients || []}
                initialRecipes={recipes}
            />
        </div>
    )
}
