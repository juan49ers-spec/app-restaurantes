'use server'

import { createClient } from "@/lib/supabaseServer"
import { getUserRestaurant } from "./utils"

interface SpendByCategory {
    category: string
    amount: number
    percentage: number
}

interface SpendTrend {
    month: string
    amount: number
}

interface TopSupplier {
    id: string
    name: string
    totalSpend: number
    invoiceCount: number
}

interface PriceVolatility {
    ingredientId: string
    ingredientName: string
    avgPrice: number
    minPrice: number
    maxPrice: number
    volatility: number // stddev as percentage
}

interface AnalyticsDashboard {
    spendByCategory: SpendByCategory[]
    spendTrend: SpendTrend[]
    topSuppliers: TopSupplier[]
    priceVolatility: PriceVolatility[]
    summary: {
        totalSpend: number
        avgMonthlySpend: number
        invoiceCount: number
        uniqueIngredients: number
    }
}

export async function getPurchaseAnalytics(): Promise<AnalyticsDashboard> {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    // Parallel data fetching
    const [invoicesResult, priceHistoryResult, ingredientsResult, suppliersResult] = await Promise.all([
        supabase
            .from('invoices')
            .select('id, total_amount, date, supplier_id')
            .eq('restaurant_id', restaurantId)
            .eq('status', 'completed')
            .gte('date', sixMonthsAgo.toISOString().split('T')[0]),
        supabase
            .from('price_history')
            .select('master_ingredient_id, price_per_unit, quantity, recorded_at')
            .eq('restaurant_id', restaurantId)
            .gte('recorded_at', sixMonthsAgo.toISOString()),
        supabase
            .from('master_ingredients')
            .select('id, name, category')
            .eq('restaurant_id', restaurantId),
        supabase
            .from('suppliers')
            .select('id, name')
            .eq('restaurant_id', restaurantId)
    ])

    const invoices = invoicesResult.data || []
    const priceHistory = priceHistoryResult.data || []
    const ingredients = new Map(ingredientsResult.data?.map(i => [i.id, i]) || [])
    const suppliers = new Map(suppliersResult.data?.map(s => [s.id, s]) || [])

    // Calculate spend by category
    const categoryMap = new Map<string, number>()
    priceHistory.forEach(ph => {
        const ing = ingredients.get(ph.master_ingredient_id)
        const category = ing?.category || 'Sin categoría'
        const amount = (ph.price_per_unit || 0) * (ph.quantity || 0)
        categoryMap.set(category, (categoryMap.get(category) || 0) + amount)
    })

    const totalCategorySpend = Array.from(categoryMap.values()).reduce((a, b) => a + b, 0)
    const spendByCategory: SpendByCategory[] = Array.from(categoryMap.entries())
        .map(([category, amount]) => ({
            category,
            amount,
            percentage: totalCategorySpend > 0 ? (amount / totalCategorySpend) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount)

    // Calculate spend trend (monthly)
    const monthMap = new Map<string, number>()
    invoices.forEach(inv => {
        const month = inv.date.substring(0, 7)
        monthMap.set(month, (monthMap.get(month) || 0) + (inv.total_amount || 0))
    })
    const spendTrend: SpendTrend[] = Array.from(monthMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, amount]) => ({ month, amount }))

    // Top suppliers
    const supplierSpend = new Map<string, { total: number; count: number }>()
    invoices.forEach(inv => {
        if (!inv.supplier_id) return
        const existing = supplierSpend.get(inv.supplier_id) || { total: 0, count: 0 }
        supplierSpend.set(inv.supplier_id, {
            total: existing.total + (inv.total_amount || 0),
            count: existing.count + 1
        })
    })
    const topSuppliers: TopSupplier[] = Array.from(supplierSpend.entries())
        .map(([id, data]) => ({
            id,
            name: suppliers.get(id)?.name || 'Desconocido',
            totalSpend: data.total,
            invoiceCount: data.count
        }))
        .sort((a, b) => b.totalSpend - a.totalSpend)
        .slice(0, 5)

    // Price volatility
    const priceByIngredient = new Map<string, number[]>()
    priceHistory.forEach(ph => {
        const prices = priceByIngredient.get(ph.master_ingredient_id) || []
        if (ph.price_per_unit) prices.push(ph.price_per_unit)
        priceByIngredient.set(ph.master_ingredient_id, prices)
    })

    const priceVolatility: PriceVolatility[] = Array.from(priceByIngredient.entries())
        .filter(([_, prices]) => prices.length >= 3)
        .map(([id, prices]) => {
            const avg = prices.reduce((a, b) => a + b, 0) / prices.length
            const variance = prices.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / prices.length
            const stddev = Math.sqrt(variance)
            return {
                ingredientId: id,
                ingredientName: ingredients.get(id)?.name || 'Desconocido',
                avgPrice: avg,
                minPrice: Math.min(...prices),
                maxPrice: Math.max(...prices),
                volatility: avg > 0 ? (stddev / avg) * 100 : 0
            }
        })
        .sort((a, b) => b.volatility - a.volatility)
        .slice(0, 10)

    // Summary
    const totalSpend = invoices.reduce((a, b) => a + (b.total_amount || 0), 0)
    const months = new Set(invoices.map(i => i.date.substring(0, 7))).size || 1

    return {
        spendByCategory,
        spendTrend,
        topSuppliers,
        priceVolatility,
        summary: {
            totalSpend,
            avgMonthlySpend: totalSpend / months,
            invoiceCount: invoices.length,
            uniqueIngredients: ingredients.size
        }
    }
}
