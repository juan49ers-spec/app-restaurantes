'use server'

import { createClient } from "@/lib/supabaseServer"
import { getUserRestaurant } from "./utils"

export interface SupplierItem {
  id: string
  supplier_id: string
  supplier_name: string
  master_ingredient_id?: string
  ingredient_name?: string
  alias_name: string
  unit: string
  price: number
  quantity: number
  last_updated: Date
  invoice_id?: string
}

export interface PriceComparison {
  ingredient_id: string
  ingredient_name: string
  base_unit: string
  suppliers: Array<{
    supplier_id: string
    supplier_name: string
    price: number
    unit: string
    is_best_price: boolean
    variance_pct: number
    last_updated: Date
  }>
}

export interface IngredientSupplierMapping {
  master_ingredient_id: string
  ingredient_name: string
  base_unit: string
  suppliers: Array<{
    supplier_id: string
    supplier_name: string
    supplier_item_id: string
    alias_name: string
    confidence_score: number
  }>
}
// Helper interfaces for Supabase Joins
interface SupplierAliasJoin {
  id: string
  alias_name: string
  master_ingredient_id: string
  supplier_id: string
  confidence_score: number
  supplier: { id: string; name: string } | null
}

interface ScannedItem {
  description?: string
  price?: string
  qty?: string
  unit?: string
}

interface InvoiceSupplierJoin {
  id: string
  supplier_id: string
  supplier: { id: string; name: string } | null
  scanned_data: ScannedItem[] | null
}

interface SupplierMatchJoin {
  master_ingredient_id: string
  master_ingredient: { name: string; base_unit: string } | null
}
/**
 * Get all supplier items mapped to a master ingredient
 */
export async function getSupplierItemMappings(): Promise<IngredientSupplierMapping[]> {
  const supabase = await createClient()
  const restaurantId = await getUserRestaurant()

  // Get all master ingredients
  const { data: ingredients } = await supabase
    .from('master_ingredients')
    .select('id, name, base_unit')
    .eq('restaurant_id', restaurantId) as { data: { id: string; name: string; base_unit: string }[] | null }

  if (!ingredients || ingredients.length === 0) return []

  // Get all supplier aliases/mappings
  const { data: mappings } = await supabase
    .from('supplier_aliases')
    .select(`
      id,
      alias_name,
      master_ingredient_id,
      supplier_id,
      confidence_score,
      supplier:suppliers(id, name)
    `)
    .eq('restaurant_id', restaurantId) as { data: SupplierAliasJoin[] | null }

  const mappingMap = new Map<string, IngredientSupplierMapping>()

  // Initialize with all ingredients
  ingredients.forEach(ing => {
    mappingMap.set(ing.id, {
      master_ingredient_id: ing.id,
      ingredient_name: ing.name,
      base_unit: ing.base_unit,
      suppliers: []
    })
  })

  // Add mappings
  mappings?.forEach((map) => {
    // Cast to typed interface
    // const map = mapping as SupplierAliasJoin // properties are already typed now
    const ingredient = mappingMap.get(map.master_ingredient_id)
    if (ingredient && map.supplier) {
      ingredient.suppliers.push({
        supplier_id: map.supplier.id,
        supplier_name: map.supplier.name,
        supplier_item_id: map.id,
        alias_name: map.alias_name,
        confidence_score: map.confidence_score || 1.0
      })
    }
  })

  return Array.from(mappingMap.values())
}

/**
 * Get price comparison for all ingredients with multiple suppliers
 */
export async function getPriceComparisons(): Promise<PriceComparison[]> {
  const supabase = await createClient()
  const restaurantId = await getUserRestaurant()

  // Get latest prices from invoices (via supplier_items or invoice_items)
  const { data: priceData } = await supabase
    .from('invoices')
    .select(`
      id,
      supplier_id,
      supplier:suppliers(id, name),
      scanned_data
    `)
    .eq('restaurant_id', restaurantId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false }) as { data: InvoiceSupplierJoin[] | null }

  if (!priceData) return []

  // Process scanned data to extract prices
  const priceMap = new Map<string, PriceComparison>()

  for (const invoice of priceData) {
    if (!invoice.scanned_data || !Array.isArray(invoice.scanned_data)) continue

    for (const item of invoice.scanned_data) {
      if (!item.description || !item.price) continue

      // Find matching master ingredient (simplified - in production use fuzzy matching)
      const { data: matches } = await supabase
        .from('supplier_aliases')
        .select('master_ingredient_id, master_ingredient:master_ingredients(name, base_unit)')
        .eq('restaurant_id', restaurantId)
        .ilike('alias_name', `%${item.description}%`)
        .limit(1) as { data: SupplierMatchJoin[] | null }

      if (!matches || matches.length === 0) continue

      const match = matches[0]
      const ingredientId = match.master_ingredient_id
      // Use variables or fallback in object creation
      const ingredientName = match.master_ingredient?.name || 'Unknown'
      const baseUnit = match.master_ingredient?.base_unit || 'kg'

      if (!priceMap.has(ingredientId)) {
        priceMap.set(ingredientId, {
          ingredient_id: ingredientId,
          ingredient_name: ingredientName,
          base_unit: baseUnit,
          suppliers: []
        })
      }

      const comparison = priceMap.get(ingredientId)!

      // Check if supplier already added (take most recent)
      const existingIndex = comparison.suppliers.findIndex(
        s => s.supplier_id === invoice.supplier_id
      )

      const supplierEntry = {
        supplier_id: invoice.supplier_id,
        supplier_name: invoice.supplier?.name || 'Unknown',
        price: parseFloat(item.price),
        unit: item.unit || comparison.base_unit,
        is_best_price: false,
        variance_pct: 0,
        last_updated: new Date()
      }

      if (existingIndex >= 0) {
        // Only update if this invoice is newer (already sorted by date)
        if (!comparison.suppliers[existingIndex].last_updated ||
          supplierEntry.last_updated > comparison.suppliers[existingIndex].last_updated) {
          comparison.suppliers[existingIndex] = supplierEntry
        }
      } else {
        comparison.suppliers.push(supplierEntry)
      }
    }
  }

  // Calculate stats and best prices
  const results = Array.from(priceMap.values()).map(comp => {
    const prices = comp.suppliers.map(s => s.price)
    const best_price = Math.min(...prices)
    const avg_price = prices.reduce((a, b) => a + b, 0) / prices.length

    // Mark best price and calculate variance
    comp.suppliers = comp.suppliers.map(s => ({
      ...s,
      is_best_price: s.price === best_price,
      variance_pct: avg_price > 0 ? ((s.price - avg_price) / avg_price) * 100 : 0
    }))

    return comp
  })

  // Only return ingredients with multiple suppliers
  return results.filter(r => r.suppliers.length >= 2)
}

/**
 * Create or update supplier alias mapping
 */
export async function createSupplierMapping(
  supplierId: string,
  aliasName: string,
  masterIngredientId: string,
  confidenceScore: number = 1.0
) {
  const supabase = await createClient()
  const restaurantId = await getUserRestaurant()

  const { data, error } = await supabase
    .from('supplier_aliases')
    .upsert({
      restaurant_id: restaurantId,
      supplier_id: supplierId,
      alias_name: aliasName,
      master_ingredient_id: masterIngredientId,
      confidence_score: confidenceScore
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/**
 * Get unmapped invoice items (items without a master ingredient mapping)
 */
export async function getUnmappedItems(): Promise<Array<{
  invoice_id: string
  item_name: string
  price: number
  quantity: number
  unit: string
  supplier_name: string
}>> {
  const supabase = await createClient()
  const restaurantId = await getUserRestaurant()

  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      id,
      supplier:suppliers(name),
      scanned_data
    `)
    .eq('restaurant_id', restaurantId)
    .eq('status', 'completed')

  if (!invoices) return []

  const unmapped: Array<{
    invoice_id: string
    item_name: string
    price: number
    quantity: number
    unit: string
    supplier_name: string
  }> = []

  for (const invoice of invoices) {
    if (!invoice.scanned_data || !Array.isArray(invoice.scanned_data)) continue

    for (const item of invoice.scanned_data) {
      if (!item.description) continue

      // Check if already mapped
      const { data: existing } = await supabase
        .from('supplier_aliases')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .ilike('alias_name', `%${item.description}%`)
        .maybeSingle()

      if (!existing) {
        unmapped.push({
          invoice_id: invoice.id,
          item_name: item.description,
          price: parseFloat(item.price) || 0,
          quantity: parseFloat(item.qty) || 1,
          unit: item.unit || 'u',
          supplier_name: (invoice as unknown as InvoiceSupplierJoin).supplier?.name || 'Unknown'
        })
      }
    }
  }

  return unmapped
}

/**
 * Get price history and trends for a specific ingredient
 */
export async function getIngredientPriceTrend(ingredientId: string) {
  const supabase = await createClient()
  const restaurantId = await getUserRestaurant()

  // Get price history
  const { data: history } = await supabase
    .from('price_history')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('entity_id', ingredientId)
    .eq('entity_type', 'INGREDIENT')
    .order('created_at', { ascending: true })

  if (!history || history.length === 0) return null

  const prices = history.map(h => h.price)
  const trend = {
    direction: prices[prices.length - 1] > prices[0] ? 'up' : 'down',
    change_pct: prices[0] > 0
      ? ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100
      : 0,
    volatility: calculateVolatility(prices),
    history: history
  }

  return trend
}

function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0

  const avg = prices.reduce((a, b) => a + b, 0) / prices.length
  const squaredDiffs = prices.map(p => Math.pow(p - avg, 2))
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / prices.length
  return Math.sqrt(variance) / avg
}
