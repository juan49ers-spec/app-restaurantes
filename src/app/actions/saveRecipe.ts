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

    // 3. Upsert Recipe
    if (!recipeId) {
        const { data, error } = await supabase
            .from('recipes')
            .insert(recipeData)
            .select()
            .single()

        if (error) throw new Error("Failed to create recipe: " + error.message)
        recipeId = data.id

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
        // Fetch old cost for history
        const { data: oldRecipe } = await supabase
            .from('recipes')
            .select('current_cost')
            .eq('id', recipeId)
            .single()

        const oldCost = oldRecipe?.current_cost || 0
        const newCost = recipeData.current_cost

        const { error } = await supabase
            .from('recipes')
            .update(recipeData)
            .eq('id', recipeId)

        if (error) throw new Error("Failed to update recipe: " + error.message)

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

    if (!recipeId) throw new Error("Recipe ID missing after save")

    // 4. Handle Ingredients (Full Replacement Strategy for simplicity)
    // First, delete existing
    const { error: deleteError } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', recipeId)

    if (deleteError) throw new Error("Failed to clear old ingredients: " + deleteError.message)

    // Then insert new
    if (input.ingredients.length > 0) {
        const ingredientsData = input.ingredients.map(ing => ({
            recipe_id: recipeId,
            master_ingredient_id: ing.type === 'RECIPE' ? null : ing.master_ingredient_id!,
            sub_recipe_id: ing.type === 'RECIPE' ? ing.sub_recipe_id! : null,
            quantity_gross: ing.quantity_gross,
            quantity_net: ing.quantity_net,
            yield_factor: ing.yield_pct, // Mapping yield_pct to yield_factor
            cost_at_time: ing.price_per_unit
        }))

        const { error: insertError } = await supabase
            .from('recipe_ingredients')
            .insert(ingredientsData)

        if (insertError) throw new Error("Failed to save ingredients: " + insertError.message)
    }

    revalidatePath('/recipes')

    return { success: true, recipeId }
}
