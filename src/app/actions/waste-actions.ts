'use server'

import { createClient } from "@/lib/supabaseServer"
import { getUserRestaurant } from "./utils"
import { revalidatePath } from "next/cache"

type IngredientData = {
    id: string
    name: string
    base_unit: 'kg' | 'l' | 'u'
    category?: string | null
    current_avg_price: number
}

type WasteLogWithIngredient = {
    id: string
    date: string
    quantity: number
    reason: string
    notes: string | null
    created_at: string
    ingredient: IngredientData[] | null
}

function isIngredientData(data: unknown): data is IngredientData {
    if (!data || typeof data !== 'object') return false
    const d = data as Record<string, unknown>
    return (
        typeof d.id === 'string' &&
        typeof d.name === 'string' &&
        (d.base_unit === 'kg' || d.base_unit === 'l' || d.base_unit === 'u') &&
        typeof d.current_avg_price === 'number'
    )
}

// ── Get Waste Logs (with optional date range) ──
export async function getWasteLogs(dateFrom?: string, dateTo?: string): Promise<WasteLogWithIngredient[]> {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    let query = supabase
        .from('waste_logs')
        .select(`
            id,
            date,
            quantity,
            reason,
            notes,
            created_at,
            ingredient:master_ingredients (
                id,
                name,
                base_unit,
                category,
                current_avg_price
            )
        `)
        .eq('restaurant_id', restaurantId)
        .order('date', { ascending: false })

    if (dateFrom) query = query.gte('date', dateFrom)
    if (dateTo) query = query.lte('date', dateTo)

    const { data, error } = await query
    if (error) throw new Error(`Error fetching waste logs: ${error.message}`)
    return (data || []) as WasteLogWithIngredient[]
}

// ── Add Waste Entry + Deduct from Stock ──
export async function addWasteEntry(entry: {
    ingredientId: string
    quantity: number
    reason: string
    date: string
    notes?: string
}) {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    // 1. Insert waste log
    const { error: wasteError } = await supabase
        .from('waste_logs')
        .insert({
            restaurant_id: restaurantId,
            ingredient_id: entry.ingredientId,
            date: entry.date,
            quantity: entry.quantity,
            reason: entry.reason,
            notes: entry.notes || null
        })

    if (wasteError) throw new Error(`Error registrando desperdicio: ${wasteError.message}`)

    // 2. Create stock movement (negative = salida)
    await supabase.from('stock_movements').insert({
        restaurant_id: restaurantId,
        ingredient_id: entry.ingredientId,
        type: 'WASTE',
        quantity: -entry.quantity,
        notes: `Desperdicio: ${entry.reason}${entry.notes ? ` - ${entry.notes}` : ''}`,
        date: entry.date
    })

    // 3. Deduct from stock
    const { data: currentStock } = await supabase
        .from('inventory_stock')
        .select('current_qty')
        .eq('restaurant_id', restaurantId)
        .eq('ingredient_id', entry.ingredientId)
        .single()

    if (currentStock) {
        const newQty = Math.max(0, currentStock.current_qty - entry.quantity)
        await supabase
            .from('inventory_stock')
            .update({
                current_qty: newQty,
                last_updated: new Date().toISOString()
            })
            .eq('restaurant_id', restaurantId)
            .eq('ingredient_id', entry.ingredientId)
    }

    revalidatePath('/desperdicios')
    revalidatePath('/stock')
    return { success: true }
}

// ── Delete Waste Entry ──
export async function deleteWasteEntry(id: string) {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    // Get the entry first to reverse the stock deduction
    const { data: entry, error: fetchError } = await supabase
        .from('waste_logs')
        .select('ingredient_id, quantity')
        .eq('id', id)
        .eq('restaurant_id', restaurantId)
        .single()

    if (fetchError || !entry) throw new Error("Desperdicio no encontrado")

    // Delete the waste log
    const { error } = await supabase
        .from('waste_logs')
        .delete()
        .eq('id', id)
        .eq('restaurant_id', restaurantId)

    if (error) throw new Error(`Error eliminando desperdicio: ${error.message}`)

    // Restore stock
    const { data: currentStock } = await supabase
        .from('inventory_stock')
        .select('current_qty')
        .eq('restaurant_id', restaurantId)
        .eq('ingredient_id', entry.ingredient_id)
        .single()

    if (currentStock) {
        await supabase
            .from('inventory_stock')
            .update({
                current_qty: currentStock.current_qty + entry.quantity,
                last_updated: new Date().toISOString()
            })
            .eq('restaurant_id', restaurantId)
            .eq('ingredient_id', entry.ingredient_id)
    }

    revalidatePath('/desperdicios')
    revalidatePath('/stock')
    return { success: true }
}

// ── Get Waste Summary (aggregated by ingredient) ──
export async function getWasteSummary(dateFrom?: string, dateTo?: string) {
    const logs = await getWasteLogs(dateFrom, dateTo)

    const summary: Record<string, {
        ingredientName: string
        unit: string
        totalQty: number
        totalCost: number
        entries: number
    }> = {}

    for (const log of logs) {
        if (!log.ingredient || log.ingredient.length === 0) continue
        
        const ing = log.ingredient[0]
        if (!isIngredientData(ing)) continue

        const key = ing.id
        if (!summary[key]) {
            summary[key] = {
                ingredientName: ing.name,
                unit: ing.base_unit,
                totalQty: 0,
                totalCost: 0,
                entries: 0
            }
        }
        summary[key].totalQty += log.quantity
        summary[key].totalCost += log.quantity * (ing.current_avg_price || 0)
        summary[key].entries += 1
    }

    return Object.values(summary).sort((a, b) => b.totalCost - a.totalCost)
}

// ── Get all ingredients (for the waste form dropdown) ──
export async function getIngredientsForWaste() {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    const { data, error } = await supabase
        .from('master_ingredients')
        .select('id, name, base_unit, category, current_avg_price')
        .eq('restaurant_id', restaurantId)
        .order('name')

    if (error) throw new Error(`Error fetching ingredients: ${error.message}`)
    return data || []
}

