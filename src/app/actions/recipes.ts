'use server'

import { createActionLogger } from '@/lib/logger'
import { createClient } from "@/lib/supabaseServer"
import { getUserRestaurant } from "./utils"
import { Recipe } from "@/types/schema"
import { executeSafeAction } from "./safe-action"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { formatRecipeIngredient, type RecipeIngredientItem } from "@/lib/recipe-utils"
import {
    parseRecipesCsvPreview,
    type RecipesCsvPayload,
} from "@/lib/importing/recipes-csv"

const log = createActionLogger('recipes')

const RecipesCsvImportSchema = z.object({
    csvText: z.string().min(1, "CSV vacío"),
})

type RecipesCsvPreflight = {
    canImport: boolean
    existingRows: {
        key: string
        rowNumbers: number[]
        message: string
    }[]
    summary: ReturnType<typeof parseRecipesCsvPreview>["summary"]
}

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
    const recipesWithMargin: RecipeWithCost[] = data.map((r) => ({
        ...r,
        calculated_margin: r.selling_price
            ? ((r.selling_price - r.current_cost) / r.selling_price) * 100
            : 0
    }))

    return recipesWithMargin
}

export async function validateRecipesCsvImport(input: z.input<typeof RecipesCsvImportSchema>): Promise<{
    success: boolean
    data?: RecipesCsvPreflight
    error?: string
}> {
    const parsed = RecipesCsvImportSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: "CSV inválido." }

    const restaurantId = await getUserRestaurant()
    if (!restaurantId) return { success: false, error: "No hay restaurante activo para importar recetas." }

    const preview = parseRecipesCsvPreview(parsed.data)
    const validationError = recipesCsvValidationError(preview)
    if (validationError) return { success: false, error: validationError }

    const supabase = await createClient()
    const existingRows = await findExistingRecipeHeaderRows(supabase, preview, restaurantId)
    if (!existingRows.success) return { success: false, error: existingRows.error }

    return {
        success: true,
        data: {
            canImport: existingRows.rows.length === 0,
            existingRows: existingRows.rows,
            summary: preview.summary,
        },
    }
}

export async function importRecipesCsv(input: z.input<typeof RecipesCsvImportSchema>): Promise<{
    success: boolean
    data?: {
        importedRows: number
        summary: ReturnType<typeof parseRecipesCsvPreview>["summary"]
    }
    error?: string
}> {
    const parsed = RecipesCsvImportSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: "CSV inválido." }

    const restaurantId = await getUserRestaurant()
    if (!restaurantId) return { success: false, error: "No hay restaurante activo para importar recetas." }

    const preview = parseRecipesCsvPreview(parsed.data)
    const validationError = recipesCsvValidationError(preview)
    if (validationError) return { success: false, error: validationError }

    const supabase = await createClient()
    const existingRows = await findExistingRecipeHeaderRows(supabase, preview, restaurantId)
    if (!existingRows.success) return { success: false, error: existingRows.error }
    if (existingRows.rows.length > 0) {
        return { success: false, error: "El CSV contiene recetas que ya existen. Revisa duplicados antes de importar." }
    }

    const rows = preview.rows
        .filter((row): row is typeof row & { payload: RecipesCsvPayload } => row.status === "valid" && row.payload !== undefined)
        .map(row => ({
            restaurant_id: restaurantId,
            name: row.payload.name,
            selling_price: row.payload.selling_price,
            current_cost: row.payload.current_cost,
            target_margin_pct: row.payload.target_margin_pct,
            prep_time_minutes: row.payload.prep_time_minutes,
            yields: row.payload.yields,
            hourly_rate: row.payload.hourly_rate,
        }))

    const { data, error } = await supabase
        .from("recipes")
        .insert(rows)
        .select()

    if (error) return { success: false, error: error.message }

    revalidatePath("/recipes")
    revalidatePath("/escandallos")
    revalidatePath("/menu-engineering")
    revalidatePath("/reports")
    revalidatePath("/consultant")

    return {
        success: true,
        data: {
            importedRows: Array.isArray(data) ? data.length : rows.length,
            summary: preview.summary,
        },
    }
}

function recipesCsvValidationError(preview: ReturnType<typeof parseRecipesCsvPreview>) {
    if (preview.fileErrors.length > 0 || preview.invalidRows > 0) {
        return "El CSV contiene errores. Revisa el preview antes de importar."
    }

    if (preview.duplicates.length > 0) {
        return "El CSV contiene duplicados internos. Revisa el preview antes de importar."
    }

    if (preview.validRows === 0) {
        return "El CSV no contiene recetas válidas."
    }

    return null
}

async function findExistingRecipeHeaderRows(
    supabase: Awaited<ReturnType<typeof createClient>>,
    preview: ReturnType<typeof parseRecipesCsvPreview>,
    restaurantId: string,
): Promise<{
    success: true
    rows: RecipesCsvPreflight["existingRows"]
} | { success: false; error: string }> {
    const validRows = preview.rows.filter((row): row is typeof row & { payload: RecipesCsvPayload } =>
        row.status === "valid" && row.payload !== undefined
    )
    const rowNumbersByName = new Map(validRows.map(row => [normalizeRecipeName(row.payload.name), [row.rowNumber]]))

    const { data, error } = await supabase
        .from("recipes")
        .select("id, name")
        .eq("restaurant_id", restaurantId)

    if (error) {
        return {
            success: false,
            error: "No se pudieron comprobar recetas existentes. Inténtalo de nuevo antes de importar.",
        }
    }

    const rows = ((data ?? []) as { id: string; name: string }[])
        .filter(row => rowNumbersByName.has(normalizeRecipeName(row.name)))
        .map(row => {
            const key = normalizeRecipeName(row.name)
            return {
                key,
                rowNumbers: rowNumbersByName.get(key) ?? [],
                message: `Ya existe una receta llamada ${row.name}.`,
            }
        })

    return { success: true, rows }
}

function normalizeRecipeName(name: string) {
    return name.trim().toLowerCase().replace(/\s+/g, " ")
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
        ...recipe,
        ingredients
    }
}
export async function getRecipePriceHistory(recipeId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('entity_id', recipeId)
        .eq('entity_type', 'RECIPE')
        .order('created_at', { ascending: true })

    if (error) {
        log.error({ err: error }, "Error fetching recipe price history")
        return []
    }
    return data
}
