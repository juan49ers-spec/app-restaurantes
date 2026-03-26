'use server'

import { createClient } from "@/lib/supabaseServer"
import { getUserRestaurant } from "./utils"
import { InventorySession, InventoryCount } from "@/types/schema"
import { revalidatePath } from "next/cache"

export async function getInventorySessions(): Promise<InventorySession[]> {
  const supabase = await createClient()
  const restaurantId = await getUserRestaurant()

  const { data, error } = await supabase
    .from('inventory_sessions')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching inventory sessions:', error)
    throw new Error('No se pudieron cargar las sesiones de inventario')
  }

  return data as InventorySession[]
}

export async function getActiveInventorySession(): Promise<InventorySession | null> {
  const supabase = await createClient()
  const restaurantId = await getUserRestaurant()

  const { data, error } = await supabase
    .from('inventory_sessions')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found'
    console.error('Error fetching active session:', error)
    return null
  }

  return data as InventorySession | null
}

export async function startInventorySession(notes?: string): Promise<InventorySession> {
  const supabase = await createClient()
  const restaurantId = await getUserRestaurant()

  // Comprobar si ya hay un draft
  const activeSession = await getActiveInventorySession()
  if (activeSession) {
    return activeSession
  }

  const { data, error } = await supabase
    .from('inventory_sessions')
    .insert({
      restaurant_id: restaurantId,
      date: new Date().toISOString().split('T')[0],
      status: 'draft',
      notes: notes || null
    })
    .select()
    .single()

  if (error) {
    console.error('Error starting inventory session:', error)
    throw new Error('No se pudo iniciar la sesión de recuento')
  }

  revalidatePath('/operations/inventory')
  return data as InventorySession
}

export async function completeInventorySession(sessionId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inventory_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId)

  if (error) {
    console.error('Error completing session:', error)
    throw new Error('No se pudo completar la sesión')
  }

  revalidatePath('/operations/inventory')
  revalidatePath(`/operations/inventory/count/${sessionId}`)
}

export async function getInventoryCounts(sessionId: string): Promise<InventoryCount[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventory_counts')
    .select('*')
    .eq('session_id', sessionId)
  
  if (error) {
    console.error('Error fetching counts:', error)
    return []
  }

  return data as InventoryCount[]
}

export async function saveInventoryCount(
  sessionId: string,
  ingredientId: string,
  quantity: number,
  unitPriceSnapshot: number,
  category?: string
): Promise<void> {
  const supabase = await createClient()

  // Realizar UPSERT en la tabla inventory_counts
  const { error } = await supabase
    .from('inventory_counts')
    .upsert(
      {
        session_id: sessionId,
        ingredient_id: ingredientId,
        quantity,
        unit_price_snapshot: unitPriceSnapshot,
        category: category || null,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: 'session_id,ingredient_id'
      }
    )

  if (error) {
    console.error('Error saving inventory count:', error)
    throw new Error('No se pudo guardar la cantidad')
  }
}

// Acción para cargar la info enriquecida para el conteo: Ingredientes + su recuento actual + categoria
export interface InventoryCountItem {
  ingredient_id: string
  name: string
  base_unit: string
  category: string
  current_avg_price: number
  quantity: number // Si es 0 es que no se ha contado aún (o de verdad es 0)
  count_id?: string
}

export async function getInventoryItemsForCount(sessionId: string): Promise<InventoryCountItem[]> {
  const supabase = await createClient()
  const restaurantId = await getUserRestaurant()

  // 1. Obtener todos los ingredientes activos
  const { data: ingredients, error: ingError } = await supabase
    .from('master_ingredients')
    .select('id, name, base_unit, category, current_avg_price')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('category')
    .order('name')

  if (ingError) {
    console.error('Error fetching ingredients:', ingError)
    throw new Error('Error al cargar ingredientes')
  }

  // 2. Obtener los conteos que ya haya en esta sesión
  const { data: counts, error: countError } = await supabase
    .from('inventory_counts')
    .select('id, ingredient_id, quantity')
    .eq('session_id', sessionId)

  if (countError) {
    console.error('Error fetching counts:', countError)
  }

  const countsMap = new Map((counts || []).map(c => [c.ingredient_id, c]))

// 3. Cruzar ambos
  const result: InventoryCountItem[] = (ingredients || []).map(ing => {
    const existingCount = countsMap.get(ing.id)
    return {
      ingredient_id: ing.id,
      name: ing.name,
      base_unit: ing.base_unit || 'u',
      category: ing.category || 'Sin Clasificar',
      current_avg_price: ing.current_avg_price || 0,
      quantity: existingCount?.quantity || 0,
      count_id: existingCount?.id
    }
  })

  return result
}

// Reporte de Consumo Real (Inventario Inicial + Compras - Inventario Final)
export interface ConsumptionReportItem {
  ingredient_id: string
  name: string
  category: string
  initial_qty: number
  purchased_qty: number
  final_qty: number
  consumed_qty: number
  consumed_value: number
}

export async function calculateConsumptionReport(
  startSessionId: string,
  endSessionId: string
): Promise<ConsumptionReportItem[]> {
  const supabase = await createClient()

  // 1. Cargar sesiones para saber las fechas
  const { data: sessions, error: sesError } = await supabase
    .from('inventory_sessions')
    .select('*')
    .in('id', [startSessionId, endSessionId])
    .order('date', { ascending: true })

  if (sesError || !sessions || sessions.length !== 2) {
    throw new Error('Sesiones inválidas para el cálculo')
  }

  const startDate = sessions[0].date
  const endDate = sessions[1].date

  // 2. Cargar recuentos
  const [initialCounts, finalCounts] = await Promise.all([
    getInventoryCounts(sessions[0].id),
    getInventoryCounts(sessions[1].id)
  ])

  // Compras reales entre ambas fechas (movimientos tipo PURCHASE / ENTRADA)
  const { data: purchases } = await supabase
    .from('stock_movements')
    .select('ingredient_id, quantity')
    .eq('restaurant_id', sessions[0].restaurant_id)
    .in('type', ['PURCHASE', 'ENTRADA'])
    .gte('date', startDate)
    .lte('date', endDate)

  const purchasedMap = new Map<string, number>()
  for (const p of (purchases || [])) {
    const prev = purchasedMap.get(p.ingredient_id) || 0
    purchasedMap.set(p.ingredient_id, prev + Math.abs(p.quantity))
  }

  const finalCountsMap = new Map(finalCounts.map(c => [c.ingredient_id, c]))
  const initialCountsMap = new Map(initialCounts.map(c => [c.ingredient_id, c]))

  const allIngredientIds = new Set([
    ...initialCounts.map(c => c.ingredient_id),
    ...finalCounts.map(c => c.ingredient_id)
  ])

  const { data: ingredients } = await supabase
    .from('master_ingredients')
    .select('id, name, category')
    .in('id', Array.from(allIngredientIds))

  const ingredientsMap = new Map((ingredients || []).map(i => [i.id, i]))

  const report: ConsumptionReportItem[] = []

  allIngredientIds.forEach(id => {
    const ing = ingredientsMap.get(id)
    if (!ing) return

    const initialQty = initialCountsMap.get(id)?.quantity || 0
    const finalQty = finalCountsMap.get(id)?.quantity || 0
    const purchasedQty = purchasedMap.get(id) || 0
    
    const consumedQty = initialQty + purchasedQty - finalQty
    
    const priceToUse = finalCountsMap.get(id)?.unit_price_snapshot 
      || initialCountsMap.get(id)?.unit_price_snapshot 
      || 0

    const consumedValue = consumedQty * priceToUse

    report.push({
      ingredient_id: id,
      name: ing.name,
      category: ing.category || 'Otros',
      initial_qty: initialQty,
      purchased_qty: purchasedQty,
      final_qty: finalQty,
      consumed_qty: consumedQty,
      consumed_value: consumedValue
    })
  })

  return report.sort((a, b) => b.consumed_value - a.consumed_value)
}
