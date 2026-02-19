'use server'

import { createClient } from "@/lib/supabaseServer"
import { getUserRestaurant } from "./utils"

interface OrderSuggestion {
    ingredientId: string
    ingredientName: string
    category: string
    suggestedQty: number
    unit: string
    preferredSupplierId: string | null
    preferredSupplierName: string | null
    estimatedCost: number
    urgency: 'critical' | 'high' | 'medium' | 'low'
    reason: string
    weeklyPattern: number[] // Mon-Sun consumption
}

interface GroupedSuggestions {
    supplierId: string | null
    supplierName: string
    items: OrderSuggestion[]
    totalEstimate: number
    contactPhone: string | null
}

export async function getSmartOrderSuggestions(): Promise<GroupedSuggestions[]> {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    // Parallel data fetching
    const [ingredientsResult, purchasesResult, suppliersResult] = await Promise.all([
        supabase
            .from('master_ingredients')
            .select('id, name, base_unit, current_avg_price, category')
            .eq('restaurant_id', restaurantId),
        supabase
            .from('price_history')
            .select('master_ingredient_id, quantity, supplier_id, recorded_at')
            .eq('restaurant_id', restaurantId)
            .gte('recorded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase
            .from('suppliers')
            .select('id, name, contact_phone')
            .eq('restaurant_id', restaurantId)
    ])

    const ingredients = ingredientsResult.data || []
    const purchases = purchasesResult.data || []
    const suppliers = new Map(suppliersResult.data?.map(s => [s.id, s]) || [])

    // Calculate per-ingredient consumption patterns
    const consumptionMap = new Map<string, {
        total: number
        supplier: string | null
        weekday: number[]
    }>()

    purchases.forEach(p => {
        const existing = consumptionMap.get(p.master_ingredient_id) || {
            total: 0,
            supplier: null,
            weekday: [0, 0, 0, 0, 0, 0, 0]
        }
        const dayOfWeek = new Date(p.recorded_at).getDay()
        existing.weekday[dayOfWeek] += p.quantity || 0
        consumptionMap.set(p.master_ingredient_id, {
            total: existing.total + (p.quantity || 0),
            supplier: p.supplier_id || existing.supplier,
            weekday: existing.weekday
        })
    })

    // Generate suggestions
    const suggestions: OrderSuggestion[] = []

    for (const ing of ingredients) {
        const consumption = consumptionMap.get(ing.id)
        if (!consumption || consumption.total === 0) continue

        const weeklyAvg = consumption.total / 4
        const peakDay = consumption.weekday.indexOf(Math.max(...consumption.weekday))
        const daysUntilPeak = (peakDay - new Date().getDay() + 7) % 7 || 7

        // Calculate urgency
        let urgency: 'critical' | 'high' | 'medium' | 'low' = 'low'
        let reason = 'Reposición regular'

        if (daysUntilPeak <= 2 && weeklyAvg > 5) {
            urgency = 'critical'
            reason = `Pico de consumo en ${daysUntilPeak} días`
        } else if (weeklyAvg > 10) {
            urgency = 'high'
            reason = 'Alto volumen semanal'
        } else if (weeklyAvg > 5) {
            urgency = 'medium'
            reason = 'Consumo moderado'
        }

        const supplier = consumption.supplier ? suppliers.get(consumption.supplier) : null

        suggestions.push({
            ingredientId: ing.id,
            ingredientName: ing.name,
            category: ing.category || 'General',
            suggestedQty: Math.ceil(weeklyAvg * 1.2),
            unit: ing.base_unit,
            preferredSupplierId: consumption.supplier,
            preferredSupplierName: supplier?.name || null,
            estimatedCost: Math.ceil(weeklyAvg * 1.2) * (ing.current_avg_price || 0),
            urgency,
            reason,
            weeklyPattern: consumption.weekday
        })
    }

    // Group by supplier
    const grouped = new Map<string | null, GroupedSuggestions>()

    suggestions.forEach(s => {
        const key = s.preferredSupplierId
        if (!grouped.has(key)) {
            const supplier = key ? suppliers.get(key) : null
            grouped.set(key, {
                supplierId: key,
                supplierName: supplier?.name || 'Sin proveedor asignado',
                items: [],
                totalEstimate: 0,
                contactPhone: supplier?.contact_phone || null
            })
        }
        const group = grouped.get(key)!
        group.items.push(s)
        group.totalEstimate += s.estimatedCost
    })

    // Sort groups by total estimate and items by urgency
    return Array.from(grouped.values())
        .map(g => ({
            ...g,
            items: g.items.sort((a, b) => {
                const order = { critical: 0, high: 1, medium: 2, low: 3 }
                return order[a.urgency] - order[b.urgency]
            })
        }))
        .sort((a, b) => b.totalEstimate - a.totalEstimate)
}

// Quick summary for dashboard widget
export async function getOrderSummary(): Promise<{
    urgentItems: number
    totalEstimate: number
    topItems: { name: string; qty: number; unit: string; urgency: string }[]
}> {
    const groups = await getSmartOrderSuggestions()
    const allItems = groups.flatMap(g => g.items)

    return {
        urgentItems: allItems.filter(i => i.urgency === 'critical' || i.urgency === 'high').length,
        totalEstimate: allItems.reduce((acc, i) => acc + i.estimatedCost, 0),
        topItems: allItems.slice(0, 5).map(i => ({
            name: i.ingredientName,
            qty: i.suggestedQty,
            unit: i.unit,
            urgency: i.urgency
        }))
    }
}
