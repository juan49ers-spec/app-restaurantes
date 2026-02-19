'use server'

import { createClient } from "@/lib/supabaseServer"
import { getUserRestaurant } from "./utils"
import { revalidatePath } from "next/cache"
import { MasterIngredient, CreateIngredientSchema, CreateIngredientInput } from "@/types/schema"
import { executeSafeAction } from "./safe-action"
import { z } from "zod"

export async function getIngredients() {
  const supabase = await createClient()
  const restaurantId = await getUserRestaurant()

  const { data, error } = await supabase
    .from('master_ingredients')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true) // Only fetch active ingredients
    .order('name')
    .limit(1000) // Safety limit

  if (error) throw new Error(error.message)
  return data as MasterIngredient[]
}

export async function updateIngredientPrice(id: string, newPrice: number) {
  const supabase = await createClient()
  const restaurant = await getUserRestaurant()

  // 1. Get current price for history
  const { data: current } = await supabase
    .from('master_ingredients')
    .select('current_avg_price')
    .eq('id', id)
    .single()

  const oldPrice = current?.current_avg_price || 0

  // 2. Update Ingredient
  const { error } = await supabase
    .from('master_ingredients')
    .update({ current_avg_price: newPrice, last_updated_at: new Date() })
    .eq('id', id)

  if (error) throw new Error(error.message)

  // 3. Log History if changed
  if (oldPrice !== newPrice) {
    const changePct = oldPrice === 0 ? 100 : ((newPrice - oldPrice) / oldPrice) * 100

    await supabase.from('price_history').insert({
      restaurant_id: restaurant,
      entity_id: id,
      entity_type: 'INGREDIENT',
      price: newPrice,
      previous_price: oldPrice,
      change_pct: parseFloat(changePct.toFixed(2))
    })
  }

  revalidatePath('/ingredients')
  revalidatePath('/recipes')
}

export async function updateIngredientWaste(id: string, newWaste: number) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('master_ingredients')
    .update({ standard_waste_pct: newWaste, last_updated_at: new Date() })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/ingredients')
  revalidatePath('/recipes')
}

export async function getIngredientPriceHistory(ingredientId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('price_history')
    .select('date, price')
    .eq('ingredient_id', ingredientId)
    .order('date', { ascending: true })
    .limit(10) // Last 10 prices for context

  if (error) {
    console.error("Error fetching price history:", error)
    return []
  }
  return data
}

/**
 * Creates a new Master Ingredient
 */
export async function createIngredient(input: CreateIngredientInput) {
  return executeSafeAction(CreateIngredientSchema, input, async (data, restaurantId) => {
    const supabase = await createClient()

    const { data: newIngredient, error } = await supabase
      .from('master_ingredients')
      .insert({
        ...data,
        restaurant_id: restaurantId,
        last_updated_at: new Date()
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    revalidatePath('/ingredients')
    return newIngredient as MasterIngredient
  })
}

/**
 * Updates a Master Ingredient (Full Master Data)
 */
export async function updateIngredient(id: string, input: Partial<CreateIngredientInput>) {
  // We reuse CreateIngredientSchema but allow partials for flexibility, 
  // though typically we send the whole form.
  // Ideally we should have an UpdateIngredientSchema.

  const supabase = await createClient()
  const restaurant = await getUserRestaurant()

  // Validate inputs if needed, or trust the permissive partial for now
  // For robustness, let's just update the fields provided.

  const { data, error } = await supabase
    .from('master_ingredients')
    .update({
      ...input,
      last_updated_at: new Date()
    })
    .eq('id', id)
    .eq('restaurant_id', restaurant)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/ingredients')
  return { success: true, data }
}

/**
 * Deletes a Master Ingredient
 */
export async function deleteIngredient(id: string) {
  return executeSafeAction(z.string().uuid(), id, async (ingredientId, restaurantId) => {
    const supabase = await createClient()

    // RLS ensures we can only delete our own ingredients

    // 1. Unlink from supplier items first (avoid foreign key constraint)
    await supabase
      .from('supplier_items')
      .update({ master_ingredient_id: null })
      .eq('master_ingredient_id', ingredientId)

    // 2. SOFT DELETE the ingredient
    // Instead of deleting, we mark it as inactive.
    // This preserves historical data and recipe costs.
    const { error } = await supabase
      .from('master_ingredients')
      .update({
        is_active: false,
        archived_at: new Date()
      })
      .eq('id', ingredientId)
      .eq('restaurant_id', restaurantId)

    if (error) throw new Error(`Failed to archive ingredient: ${error.message}`)

    revalidatePath('/ingredients', 'page')
    revalidatePath('/', 'layout')
    return { success: true }
  })
}

/**
 * Checks if an ingredient is used in any recipes
 */
export async function checkIngredientUsage(ingredientId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('recipe_ingredients')
    .select(`
      recipe_id,
      recipes (
        id,
        name
      )
    `)
    .eq('master_ingredient_id', ingredientId)

  if (error) {
    console.error("Error checking usage:", error)
    return []
  }

  // Extract unique recipe names
  // Supabase returns an array of objects for the relation
  const recipeNames = data.map((item: { recipe_id: string, recipes: { name: string }[] | { name: string } | null }) => {
    const recipe = Array.isArray(item.recipes) ? item.recipes[0] : item.recipes
    if (recipe?.name) return recipe.name as string
    return "Receta desconocida (Referencia huérfana)"
  })

  // Deduplicate
  return Array.from(new Set(recipeNames))
}

/**
 * Import ingredients in bulk from CSV
 */
export async function importIngredientsBulk(rows: Array<{
  nombre: string
  unidad_base: string
  categoria?: string
  merma_pct: number
  precio: number
  alergenos?: string
}>) {
  const supabase = await createClient()
  const restaurantId = await getUserRestaurant()

  // 1. Get ALL ingredients map (active and inactive) for this restaurant
  const { data: existingIngredients } = await supabase
    .from('master_ingredients')
    .select('id, name, is_active')
    .eq('restaurant_id', restaurantId)

  const existingMap = new Map(existingIngredients?.map(i => [i.name.toLowerCase(), i]))

  // 2. Process rows and prepare operations
  let createdCount = 0
  let updatedCount = 0
  let reactivatedCount = 0

  const ops = rows.map(row => {
    const normalizeUnit = (unit: string): 'kg' | 'l' | 'u' => {
      const normalized = unit.toLowerCase().trim()
      const mapping: Record<string, 'kg' | 'l' | 'u'> = {
        'kg': 'kg', 'g': 'kg', 'gramo': 'kg', 'gramos': 'kg',
        'l': 'l', 'litro': 'l', 'litros': 'l', 'ml': 'l',
        'u': 'u', 'unidad': 'u', 'unidades': 'u', 'uds': 'u', 'ud': 'u', 'botella': 'u', 'caja': 'u'
      }
      return mapping[normalized] || 'kg'
    }

    const name = row.nombre.trim()
    const existing = existingMap.get(name.toLowerCase())

    // Metrics calculation
    if (!existing) {
      createdCount++
    } else if (!existing.is_active) {
      reactivatedCount++
    } else {
      updatedCount++
    }

    return {
      id: existing?.id, // If exists, we update it
      restaurant_id: restaurantId,
      name: name,
      base_unit: normalizeUnit(row.unidad_base),
      category: row.categoria || null,
      standard_waste_pct: row.merma_pct / 100,
      current_avg_price: row.precio,
      last_updated_at: new Date(),
      is_active: true, // Auto-reactivate if it was archived
      archived_at: null
    }
  })

  const { data, error } = await supabase
    .from('master_ingredients')
    .upsert(ops, { onConflict: 'restaurant_id, name' }) // Uses the new UNIQUE constraint
    .select()

  if (error) {
    console.error('Error importing ingredients:', error)
    throw new Error(`Failed to import ingredients: ${error.message}`)
  }

  revalidatePath('/ingredients')

  return {
    success: true,
    count: data?.length || 0,
    summary: {
      created: createdCount,
      updated: updatedCount,
      reactivated: reactivatedCount,
      total: data?.length || 0
    }
  }
}
