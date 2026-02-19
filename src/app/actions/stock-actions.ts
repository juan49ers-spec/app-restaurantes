'use server'

import { createClient } from "@/lib/supabaseServer"
import { getUserRestaurant } from "./utils"
import { revalidatePath } from "next/cache"
import { RecipeIngredient } from "@/types/schema"

type IngredientData = {
    id: string
    name: string
    base_unit: 'kg' | 'l' | 'u'
}

function isIngredientData(data: unknown): data is IngredientData {
    if (!data || typeof data !== 'object') return false
    const d = data as Record<string, unknown>
    return (
        typeof d.id === 'string' &&
        typeof d.name === 'string' &&
        (d.base_unit === 'kg' || d.base_unit === 'l' || d.base_unit === 'u')
    )
}

// ── Get Full Inventory (stock + ingredient info) ──
export async function getInventoryStock() {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    const { data, error } = await supabase
        .from('inventory_stock')
        .select(`
            id,
            current_qty,
            min_qty,
            last_updated,
            ingredient:master_ingredients (
                id,
                name,
                base_unit,
                category,
                current_avg_price
            )
        `)
        .eq('restaurant_id', restaurantId)
        .order('last_updated', { ascending: false })

    if (error) throw new Error(`Error fetching inventory: ${error.message}`)
    return data || []
}

// ── Set / Adjust Stock for a single ingredient ──
export async function upsertStock(ingredientId: string, currentQty: number, minQty: number = 0) {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    const { data, error } = await supabase
        .from('inventory_stock')
        .upsert({
            restaurant_id: restaurantId,
            ingredient_id: ingredientId,
            current_qty: currentQty,
            min_qty: minQty,
            last_updated: new Date().toISOString()
        }, {
            onConflict: 'restaurant_id,ingredient_id'
        })
        .select()
        .single()

    if (error) throw new Error(`Error upserting stock: ${error.message}`)

    revalidatePath('/stock')
    return data
}

// ── Get Stock Movements (with optional filters) ──
export async function getStockMovements(filters?: {
    ingredientId?: string
    type?: string
    dateFrom?: string
    dateTo?: string
    limit?: number
}) {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    let query = supabase
        .from('stock_movements')
        .select(`
            id,
            type,
            quantity,
            reference_id,
            notes,
            date,
            created_at,
            ingredient:master_ingredients (
                id,
                name,
                base_unit
            )
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })

    if (filters?.ingredientId) query = query.eq('ingredient_id', filters.ingredientId)
    if (filters?.type) query = query.eq('type', filters.type)
    if (filters?.dateFrom) query = query.gte('date', filters.dateFrom)
    if (filters?.dateTo) query = query.lte('date', filters.dateTo)
    if (filters?.limit) query = query.limit(filters.limit)

    const { data, error } = await query
    if (error) throw new Error(`Error fetching stock movements: ${error.message}`)
    return data || []
}

// ── Process Recipe Sales → Auto-reduce stock ──
// The core logic logic: explode recipes into ingredients and deduct from stock via Atomic RPC
export async function processRecipeSales(date: string, sales: { recipeId: string; qty: number }[]) {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    // 1. Prepare Sales Data for RPC
    const salesPayload = sales
        .filter(s => s.qty > 0)
        .map(s => ({
            recipe_id: s.recipeId,
            quantity_sold: s.qty
        }))

    if (salesPayload.length === 0) return { success: true, ingredientsAffected: 0, alerts: [] }

    // 2. Explode recipes (Shared Logic)
    const ingredientConsumption = await getIngredientConsumption(sales)

    // 3. Prepare Deductions Data for RPC
    const deductionsPayload = Object.entries(ingredientConsumption).map(([ingredientId, qty]) => ({
        ingredient_id: ingredientId,
        quantity_deducted: qty
    }))

    // 4. Call Atomic RPC (Transaction)
    const { data: alerts, error: rpcError } = await supabase.rpc('process_daily_sales_atomic', {
        p_restaurant_id: restaurantId,
        p_date: date,
        p_sales: salesPayload,
        p_deductions: deductionsPayload
    })

    if (rpcError) throw new Error(`Error atomico procesando ventas: ${rpcError.message}`)

    revalidatePath('/stock')

    // Return alerts so UI can show them
    return {
        success: true,
        ingredientsAffected: Object.keys(ingredientConsumption).length,
        alerts: alerts || [] // [{ ingredient_name, current_qty, min_qty }]
    }
}

// ── Helper: Calculate Total Ingredient Consumption (Recursive) ──
export async function getIngredientConsumption(sales: { recipeId: string; qty: number }[]) {
    const supabase = await createClient()
    const ingredientConsumption: Record<string, number> = {}

    // Helper to fetch keys
    const recipeIdsToFetch = new Set(sales.map(s => s.recipeId))

    // Iterative approach to gather all needed recipe ingredients
    let allInvolvedIngredients: Partial<RecipeIngredient>[] = []
    let currentRecipeIds = Array.from(recipeIdsToFetch)
    const processedRecipeIds = new Set<string>()

    // Max depth 5 to prevent infinite loops
    for (let depth = 0; depth < 5; depth++) {
        if (currentRecipeIds.length === 0) break

        const { data: ingredients, error } = await supabase
            .from('recipe_ingredients')
            .select(`
                recipe_id, 
                master_ingredient_id, 
                sub_recipe_id, 
                quantity_gross,
                yield_factor
            `)
            .in('recipe_id', currentRecipeIds)

        if (error) {
            console.error("Error fetching recipe ingredients for explosion:", error)
            break
        }

        if (!ingredients) break

        const typedIngredients = ingredients as Partial<RecipeIngredient>[]
        allInvolvedIngredients = [...allInvolvedIngredients, ...typedIngredients]

        // Mark current as processed
        currentRecipeIds.forEach(id => processedRecipeIds.add(id))

        // Find next layer of sub-recipes
        const nextLayerIds = new Set<string>()
        typedIngredients.forEach((ing) => {
            if (ing.sub_recipe_id && !processedRecipeIds.has(ing.sub_recipe_id)) {
                nextLayerIds.add(ing.sub_recipe_id)
            }
        })

        currentRecipeIds = Array.from(nextLayerIds)
    }

    // Map: Recipe -> [List of Ingredients]
    const recipeMap = new Map<string, Partial<RecipeIngredient>[]>()
    allInvolvedIngredients.forEach(ing => {
        if (!ing.recipe_id) return
        const list = recipeMap.get(ing.recipe_id) || []
        list.push(ing)
        recipeMap.set(ing.recipe_id, list)
    })

    // Recursive resolver function
    const resolveIngredients = (recipeId: string, multiplier: number) => {
        const ingredients = recipeMap.get(recipeId)
        if (!ingredients) return

        ingredients.forEach((ing) => {
            if (!ing.quantity_gross) return
            const qty = ing.quantity_gross * multiplier

            if (ing.master_ingredient_id) {
                // Base Case: Raw Ingredient
                ingredientConsumption[ing.master_ingredient_id] =
                    (ingredientConsumption[ing.master_ingredient_id] || 0) + qty
            } else if (ing.sub_recipe_id) {
                // Recursive Case: Sub Recipe
                resolveIngredients(ing.sub_recipe_id, qty)
            }
        })
    }

    // Execute for each sale
    for (const sale of sales) {
        if (sale.qty <= 0) continue
        resolveIngredients(sale.recipeId, sale.qty)
    }

    return ingredientConsumption
}

// ── Preview Stock Impact (for UI confirmation) ──
export async function previewStockImpact(sales: { recipeId: string; qty: number }[]) {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    // 1. Calculate Consumption
    const consumption = await getIngredientConsumption(sales)
    const ingredientIds = Object.keys(consumption)

    if (ingredientIds.length === 0) return []

    // 2. Fetch Current Stock & Names
    const { data: stocks, error } = await supabase
        .from('inventory_stock')
        .select(`
            ingredient_id,
            current_qty,
            ingredient:master_ingredients (
                id,
                name,
                base_unit
            )
        `)
        .eq('restaurant_id', restaurantId)
        .in('ingredient_id', ingredientIds)

    if (error) throw new Error(`Error fetching stock for preview: ${error.message}`)

    const result = ingredientIds.map(id => {
        const stockEntry = stocks?.find(s => s.ingredient_id === id)
        const ingredientArray = stockEntry?.ingredient as IngredientData[] | null
        const ingredientData = ingredientArray?.[0]
        
        if (!isIngredientData(ingredientData)) {
            return {
                ingredientId: id,
                name: 'Unknown Ingredient',
                unit: 'units',
                currentStock: stockEntry?.current_qty || 0,
                deduction: consumption[id],
                estimatedStock: (stockEntry?.current_qty || 0) - consumption[id]
            }
        }

        return {
            ingredientId: id,
            name: ingredientData.name,
            unit: ingredientData.base_unit,
            currentStock: stockEntry?.current_qty || 0,
            deduction: consumption[id],
            estimatedStock: (stockEntry?.current_qty || 0) - consumption[id]
        }
    })

    return result
}

// ── Get Daily Recipe Sales for a date ──
export async function getDailyRecipeSales(date: string) {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    const { data, error } = await supabase
        .from('daily_recipe_sales')
        .select(`
            id,
            date,
            quantity_sold,
            recipe:recipes (
                id,
                name,
                selling_price,
                current_cost
            )
        `)
        .eq('restaurant_id', restaurantId)
        .eq('date', date)

    if (error) throw new Error(`Error fetching daily sales: ${error.message}`)
    return data || []
}

// ── Get all recipes (for the sales form dropdown) ──
export async function getRecipesForSales() {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    const { data, error } = await supabase
        .from('recipes')
        .select('id, name, selling_price, current_cost')
        .eq('restaurant_id', restaurantId)
        .order('name')

    if (error) throw new Error(`Error fetching recipes: ${error.message}`)
    return data || []
}

// ── Initialize stock for all ingredients that don't have entries yet ──
export async function initializeAllStock() {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    // Get all ingredients
    const { data: ingredients } = await supabase
        .from('master_ingredients')
        .select('id')
        .eq('restaurant_id', restaurantId)

    if (!ingredients?.length) return { initialized: 0 }

    // Get existing stock entries
    const { data: existing } = await supabase
        .from('inventory_stock')
        .select('ingredient_id')
        .eq('restaurant_id', restaurantId)

    const existingIds = new Set((existing || []).map(e => e.ingredient_id))

    // Insert missing ones
    const missing = ingredients
        .filter(i => !existingIds.has(i.id))
        .map(i => ({
            restaurant_id: restaurantId,
            ingredient_id: i.id,
            current_qty: 0,
            min_qty: 0
        }))

    if (missing.length > 0) {
        const { error } = await supabase.from('inventory_stock').insert(missing)
        if (error) throw new Error(`Error initializing stock: ${error.message}`)
    }

    revalidatePath('/stock')
    return { initialized: missing.length }
}

// ── Manual Stock Addition (for non-invoice purchases) ──
export async function addManualStockMovement(data: {
    ingredientId: string
    quantity: number
    type: 'MANUAL_ADD' | 'CORRECTION'
    price?: number
    notes?: string
    date?: string
}) {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    // 1. Create Stock Movement
    const { error: moveError } = await supabase.from('stock_movements').insert({
        restaurant_id: restaurantId,
        ingredient_id: data.ingredientId,
        type: data.type,
        quantity: data.quantity,
        notes: data.notes,
        date: data.date || new Date().toISOString()
    })

    if (moveError) throw new Error(`Error creating movement: ${moveError.message}`)

    // 2. Update Inventory Stock
    // Fetch current to increment
    const { data: currentStock } = await supabase
        .from('inventory_stock')
        .select('current_qty')
        .eq('restaurant_id', restaurantId)
        .eq('ingredient_id', data.ingredientId)
        .single()

    if (currentStock) {
        await supabase.from('inventory_stock')
            .update({
                current_qty: currentStock.current_qty + data.quantity,
                last_updated: new Date().toISOString()
            })
            .eq('restaurant_id', restaurantId)
            .eq('ingredient_id', data.ingredientId)
    } else {
        await supabase.from('inventory_stock').insert({
            restaurant_id: restaurantId,
            ingredient_id: data.ingredientId,
            current_qty: data.quantity,
            min_qty: 0
        })
    }

    // 3. Update Price if provided (Last Purchase Price)
    if (data.price && data.price > 0) {
        // Update Master Ingredient
        await supabase
            .from('master_ingredients')
            .update({
                current_avg_price: data.price,
                last_updated_at: new Date()
            })
            .eq('id', data.ingredientId)

        // Add to Price History (Generic 'Manual' Supplier or null)
        await supabase.from('price_history').insert({
            restaurant_id: restaurantId,
            ingredient_id: data.ingredientId,
            price: data.price,
            date: data.date || new Date().toISOString()
        })
    }

    revalidatePath('/stock')
    return { success: true }
}
