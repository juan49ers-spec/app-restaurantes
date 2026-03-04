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
    idempotency_key?: string
}

export async function saveRecipe(input: SaveRecipeInput) {
    const supabase = await createClient()

    // 1. Get Dynamic Restaurant ID
    const restaurant = await getRestaurant()
    if (!restaurant) throw new Error("No restaurant context found. Please reload or create a restaurant.")

    const restaurant_id = restaurant.id

    // 2. Prepare Recipe Data
    const recipeData = {
        restaurant_id,
        name: input.name,
        selling_price: input.selling_price,
        target_margin_pct: input.target_margin_pct,
        hourly_rate: input.hourly_rate,
        prep_time_minutes: input.prep_time_minutes,
        yields: input.yields,
        // Calculate current cost from ingredients
        current_cost: input.ingredients.reduce((sum, item) => sum + (item.quantity_gross * item.price_per_unit), 0),
        updated_at: new Date().toISOString()
    }

    let recipeId = input.id === 'new' ? undefined : input.id

    // 3. Prepare RPC Payload & Fetch old cost if updating
    let oldCost = 0;
    const newRecipeId = recipeId || crypto.randomUUID()

    if (recipeId) {
        const { data: oldRecipe } = await supabase
            .from('recipes')
            .select('current_cost')
            .eq('id', recipeId)
            .single()
        oldCost = oldRecipe?.current_cost || 0
    }

    // El payload asume que enviamos los ingredientes en un Array JSON 
    const rpcIngredients = input.ingredients.map(ing => ({
        ingredient_id: ing.type === 'RECIPE' ? ing.sub_recipe_id : ing.master_ingredient_id,
        quantity_used: ing.quantity_gross,
        cost_contribution: ing.quantity_gross * ing.price_per_unit // o cost_at_time
    }))

    const rpcPayload = {
        p_recipe_id: newRecipeId,
        p_restaurant_id: restaurant_id,
        p_name: input.name,
        p_category: 'General', // TODO: Add category to input later if needed
        p_prep_time_minutes: input.prep_time_minutes,
        p_cost: recipeData.current_cost,
        p_price: input.selling_price,
        p_margin_percentage: input.target_margin_pct,
        p_ingredients: rpcIngredients,
        p_idempotency_key: input.idempotency_key || null
    }

    // 4. Exec RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc('upsert_recipe_with_ingredients', rpcPayload)
    if (rpcError) throw new Error("Failed to save recipe atomically: " + rpcError.message)
    recipeId = newRecipeId

    // 5. Handle Price History Logging
    if (input.id === 'new') {
        // Initial History Log
        await supabase.from('price_history').insert({
            restaurant_id,
            entity_id: recipeId,
            entity_type: 'RECIPE',
            price: recipeData.current_cost,
            previous_price: 0,
            change_pct: 100
        })
    } else {
        const newCost = recipeData.current_cost

        // Log History if cost changed by > 1% (to avoid noise)
        const diff = Math.abs(newCost - oldCost)
        const pctDiff = oldCost > 0 ? (diff / oldCost) * 100 : 100

        if (pctDiff > 1) { // 1% threshold
            await supabase.from('price_history').insert({
                restaurant_id,
                entity_id: recipeId,
                entity_type: 'RECIPE',
                price: newCost,
                previous_price: oldCost,
                change_pct: parseFloat(((newCost - oldCost) / oldCost * 100).toFixed(2))
            })
        }
    }

    revalidatePath('/recipes')

    return { success: true, recipeId }
}
