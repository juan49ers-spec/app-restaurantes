'use server'

import { createClient } from "@/lib/supabaseServer"
import { RecipeIngredientInput } from "@/hooks/useRecipeCalculator"
import { revalidatePath } from "next/cache"
import { getRestaurant } from "@/lib/auth-helpers"

type SaveRecipeInput = {
    id?: string | 'new'
    name: string
    selling_price: number
    target_margin_pct: number
    hourly_rate: number
    prep_time_minutes: number
    yields: number
    ingredients: RecipeIngredientInput[]
}

export async function saveRecipe(input: SaveRecipeInput) {
    const supabase = await createClient()

    const restaurant = await getRestaurant()
    if (!restaurant) throw new Error("No restaurant context found. Please reload or create a restaurant.")

    const restaurant_id = restaurant.id
    const isNew = !input.id || input.id === 'new'
    const recipeId = isNew ? crypto.randomUUID() : input.id
    const currentCost = input.ingredients.reduce((sum, item) => sum + (item.quantity_gross * item.price_per_unit), 0)

    let oldCost = 0
    if (!isNew) {
        const { data: oldRecipe } = await supabase
            .from('recipes')
            .select('current_cost')
            .eq('id', recipeId)
            .single()
        oldCost = oldRecipe?.current_cost || 0
    }

    const ingredientsJson = input.ingredients.map(ing => ({
        master_ingredient_id: ing.type === 'RECIPE' ? ing.sub_recipe_id : ing.master_ingredient_id,
        quantity_gross: ing.quantity_gross,
        quantity_net: ing.quantity_gross,
        yield_factor: 1.0,
        cost_at_time: ing.price_per_unit,
    }))

    const { data: rpcResult, error: rpcError } = await supabase.rpc('upsert_recipe_with_ingredients', {
        p_recipe_id: recipeId,
        p_restaurant_id: restaurant_id,
        p_name: input.name,
        p_prep_time_minutes: input.prep_time_minutes,
        p_current_cost: currentCost,
        p_selling_price: input.selling_price,
        p_target_margin_pct: input.target_margin_pct,
        p_hourly_rate: input.hourly_rate,
        p_yields: input.yields,
        p_ingredients: ingredientsJson,
    })

    if (rpcError) throw new Error("Failed to save recipe: " + rpcError.message)

    const result = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult
    if (result && !result.success) {
        throw new Error("Failed to save recipe: " + (result.error_message || 'Unknown error'))
    }

    if (isNew) {
        await supabase.from('price_history').insert({
            restaurant_id,
            entity_id: recipeId,
            entity_type: 'RECIPE',
            price: currentCost,
            previous_price: 0,
            change_pct: 100,
        })
    } else {
        const diff = Math.abs(currentCost - oldCost)
        const pctDiff = oldCost > 0 ? (diff / oldCost) * 100 : 100

        if (pctDiff > 1) {
            await supabase.from('price_history').insert({
                restaurant_id,
                entity_id: recipeId,
                entity_type: 'RECIPE',
                price: currentCost,
                previous_price: oldCost,
                change_pct: parseFloat(((currentCost - oldCost) / oldCost * 100).toFixed(2)),
            })
        }
    }

    revalidatePath('/recipes')

    return { success: true, recipeId }
}
