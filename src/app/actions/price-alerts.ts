'use server'

import { createClient } from "@/lib/supabaseServer"
import { getUserRestaurant } from "./utils"
import { PriceAlertRuleSchema, type PriceAlertRule } from "@/types/schema"
import { revalidatePath } from "next/cache"

export async function getPriceAlertRules(): Promise<PriceAlertRule[]> {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    const { data, error } = await supabase
        .from('price_alert_rules')
        .select('id, restaurant_id, ingredient_id, category, max_variance_pct, is_active, created_at')
        .eq('restaurant_id', restaurantId)

    if (error) return []
    return data as PriceAlertRule[]
}

export async function createPriceAlertRule(formData: FormData) {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    const rawData = {
        restaurant_id: restaurantId,
        ingredient_id: formData.get('ingredient_id') || undefined,
        category: formData.get('category') || undefined,
        max_variance_pct: Number(formData.get('max_variance_pct')),
        is_active: true
    }

    const validated = PriceAlertRuleSchema.parse(rawData)

    const { error } = await supabase
        .from('price_alert_rules')
        .insert(validated)

    if (error) throw error

    revalidatePath('/purchasing/analytics')
}

export async function deletePriceAlertRule(id: string) {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    const { error } = await supabase
        .from('price_alert_rules')
        .delete()
        .eq('id', id)
        .eq('restaurant_id', restaurantId)

    if (error) throw error

    revalidatePath('/purchasing/analytics')
}

interface AlertViolation {
    id: string
    ingredientName: string
    currentPrice: number
    basePrice: number
    variance: number
    ruleThreshold: number
    date: string
}

export async function checkAlertViolations(): Promise<AlertViolation[]> {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    const [rulesResult, historyResult, ingredientsResult] = await Promise.all([
        supabase.from('price_alert_rules').select('id, restaurant_id, ingredient_id, category, max_variance_pct, is_active').eq('restaurant_id', restaurantId).eq('is_active', true),
        supabase.from('price_history').select('id, master_ingredient_id, variance_pct, price_per_unit, recorded_at').eq('restaurant_id', restaurantId).order('recorded_at', { ascending: false }).limit(100),
        supabase.from('master_ingredients').select('id, name').eq('restaurant_id', restaurantId)
    ])

    const rules = rulesResult.data as PriceAlertRule[] || []
    const history = historyResult.data || []
    const ingredients = new Map(ingredientsResult.data?.map(i => [i.id, i.name]) || [])

    const violations: AlertViolation[] = []

    history.forEach(h => {
        const matchingRule = rules.find(r =>
            (r.ingredient_id && r.ingredient_id === h.master_ingredient_id) ||
            (r.category && !r.ingredient_id) // Category rules would need more complex lookup
        )

        if (matchingRule) {
            const variance = Math.abs(h.variance_pct || 0) * 100
            if (variance > matchingRule.max_variance_pct) {
                violations.push({
                    id: h.id,
                    ingredientName: ingredients.get(h.master_ingredient_id) || 'Desconocido',
                    currentPrice: h.price_per_unit || 0,
                    basePrice: (h.price_per_unit || 0) / (1 + (h.variance_pct || 0)),
                    variance,
                    ruleThreshold: matchingRule.max_variance_pct,
                    date: h.recorded_at
                })
            }
        }
    })

    return violations.slice(0, 5) // Return top 5 recent violations
}
