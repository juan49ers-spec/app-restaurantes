'use server'

import { createClient } from "@/lib/supabaseServer"
import { getUserRestaurant } from "./utils"
import { Recipe } from "@/types/schema"
import { executeSafeAction } from "./safe-action"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { formatRecipeIngredient, type RecipeIngredientItem } from "@/lib/recipe-utils"

type SubRecipeFrag = { id: string, name: string, current_cost: number, allergens?: string[] }
type MasterFrag = { id: string, name: string, base_unit: string, current_avg_price: number, standard_waste_pct: number, allergens?: string[] }

type RawRecipeIngredient = {
    id: string
    quantity_gross: number
    quantity_net: number
    cost_at_time?: number
    yield_factor?: number
    sub_recipe: SubRecipeFrag | SubRecipeFrag[] | null
    master_ingredient: MasterFrag | MasterFrag[] | null
}

export type RecipeWithCost = Recipe & {
    calculated_margin: number
}

export type RecipeDetailItem = {
    id: string
    type?: 'INGREDIENT' | 'RECIPE'
    ingredient_name: string
    quantity_gross: number
    quantity_net: number
    unit: string
    cost_per_unit: number
    total_cost: number
    waste_pct: number
}

export async function getRecipes() {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('restaurant_id', restaurantId) // STRICT: Use dynamic ID
        .order('name')

    if (error) throw new Error(error.message)

    // Calculate Margin
    const recipesWithMargin: RecipeWithCost[] = (data || []).map(recipe => ({
        ...recipe,
        calculated_margin: recipe.selling_price && recipe.current_cost
            ? ((recipe.selling_price - recipe.current_cost) / recipe.selling_price) * 100
            : 0
    }))

    return recipesWithMargin
}

export async function getRecipeDetails(recipeId: string) {
    const supabase = await createClient()

    // Join recipe_ingredients -> master_ingredients AND sub_recipes
    const { data: ingredientsRaw, error } = await supabase
        .from('recipe_ingredients')
        .select(`
            id,
            quantity_gross,
            quantity_net,
            cost_at_time,
            yield_factor,
            master_ingredient:master_ingredients (
                id,
                name,
                base_unit,
                standard_waste_pct,
                current_avg_price
            ),
            sub_recipe:recipes!recipe_ingredients_sub_recipe_id_fkey (
                id,
                name,
                current_cost
            )
        `)
        .eq('recipe_id', recipeId)

    if (error) throw new Error(error.message)


    return ingredientsRaw.map((item: RawRecipeIngredient) => {
        // Safe access helper
        const getJoinResult = <T>(obj: T | T[] | null): T | null => {
            if (!obj) return null
            return Array.isArray(obj) ? obj[0] : obj
        }

        const subRecipe = getJoinResult(item.sub_recipe)
        const masterIngredient = getJoinResult(item.master_ingredient)

        const isRecipe = !!subRecipe
        const name = isRecipe ? subRecipe.name : masterIngredient?.name || 'Unknown'
        const unit = isRecipe ? 'unit' : masterIngredient?.base_unit || 'kg'
        const price = isRecipe ? subRecipe.current_cost : masterIngredient?.current_avg_price || 0
        const waste = isRecipe ? 0 : masterIngredient?.standard_waste_pct || 0

        return {
            id: item.id,
            type: isRecipe ? 'RECIPE' as const : 'INGREDIENT' as const,
            ingredient_name: name,
            quantity_gross: item.quantity_gross,
            quantity_net: item.quantity_net,
            unit: unit,
            waste_pct: waste,
            cost_per_unit: price,
            total_cost: (item.quantity_gross * price)
        }
    })
}

/**
 * Deletes a Recipe
 */
export async function deleteRecipe(id: string) {
    return executeSafeAction(z.string().uuid(), id, async (recipeId, restaurantId) => {
        const supabase = await createClient()

        // 1. Delete Recipe Ingredients first (Standard practice, though cascading might handle it)
        const { error: ingError } = await supabase
            .from('recipe_ingredients')
            .delete()
            .eq('recipe_id', recipeId)

        if (ingError) throw new Error("Failed to delete recipe ingredients: " + ingError.message)

        // 2. Delete Recipe
        const { error } = await supabase
            .from('recipes')
            .delete()
            .eq('id', recipeId)
            .eq('restaurant_id', restaurantId) // Double check for safety

        if (error) throw new Error(error.message)

        revalidatePath('/recipes')
        return { success: true }
    })
}


export async function getRecipeForEdit(recipeId: string) {
    const supabase = await createClient()

    // 1. Get Recipe
    const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipeId)
        .single()

    if (recipeError) throw new Error("Recipe not found: " + recipeError.message)

    // 2. Get Ingredients
    const { data: ingredientsRaw, error: ingError } = await supabase
        .from('recipe_ingredients')
        .select(`
            id,
            quantity_gross,
            quantity_net,
            cost_at_time,
            yield_factor,
            master_ingredient:master_ingredients (
                id,
                name,
                base_unit,
                standard_waste_pct,
                current_avg_price
            ),
            sub_recipe:recipes!recipe_ingredients_sub_recipe_id_fkey (
                id,
                name,
                current_cost
            )
        `)
        .eq('recipe_id', recipeId)

    if (ingError) throw new Error(ingError.message)

    // 3. Map Ingredients - Handle Supabase array response
    const ingredients = (ingredientsRaw as unknown as RawRecipeIngredient[]).map((item) => {
        // Supabase returns nested relations as arrays, extract first element
        const formattedItem: RecipeIngredientItem = {
            id: item.id || '',
            quantity_gross: item.quantity_gross,
            quantity_net: item.quantity_net,
            yield_factor: item.yield_factor || null,
            master_ingredient: Array.isArray(item.master_ingredient)
                ? (item.master_ingredient[0] as MasterFrag) || null
                : item.master_ingredient,
            sub_recipe: Array.isArray(item.sub_recipe)
                ? (item.sub_recipe[0] as SubRecipeFrag) || null
                : item.sub_recipe
        }
        return formatRecipeIngredient(formattedItem)
    })

    return {
        ...(recipe as unknown as Recipe),
        ingredients
    }
}
export async function getRecipePriceHistory(recipeId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('price_history')
        .select('price, created_at, change_pct')
        .eq('entity_id', recipeId)
        .eq('entity_type', 'RECIPE')
        .order('created_at', { ascending: true })

    if (error) {
        console.error("Error fetching recipe price history:", error)
        return []
    }
    return data
}
