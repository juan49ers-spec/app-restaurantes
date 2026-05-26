'use server'

import { createClient } from "@/lib/supabaseServer"
import { startOfMonth, endOfMonth } from "date-fns"

interface ProductStat {
    id: string
    name: string
    totalQty: number
    totalRevenue: number
    totalCost: number
    unitMargin: number
}

export interface BCGMetrics {
    stars: ProductStat[]
    cows: ProductStat[]
    dogs: ProductStat[]
    puzzles: ProductStat[]
    thresholds: {
        avgMargin: number
        avgPopularity: number
    }
}

export interface GhostProduct {
    name: string
    revenue_lost_potential: number
    quantity_sold: number
    last_sold: string
}

export async function getFinancialPulse(restaurantId: string, startDate?: string, endDate?: string) {
    const supabase = await createClient()
    const now = new Date()
    const start = startDate ? new Date(startDate) : startOfMonth(now)
    const end = endDate ? new Date(endDate) : endOfMonth(now)

    // 1. Fetch Granular Sales Data
    const { data: sales, error } = await supabase
        .from('product_sales')
        .select(`
            product_name,
            quantity_sold,
            revenue_total,
            unit_price,
            date,
            recipe_id,
            recipes (
                name,
                current_cost,
                selling_price
            )
        `)
        .eq('restaurant_id', restaurantId)
        .gte('date', start.toISOString())
        .lte('date', end.toISOString())

    if (error) throw error
    if (!sales || sales.length === 0) return { bcg: null, ghosts: [], kpis: null }

    // 2. Identify Ghost Products (No valid recipe linked)
    // Group by product name
    const ghostMap = new Map<string, GhostProduct>()

    sales.forEach(sale => {
        if (!sale.recipe_id || !sale.recipes) {
            const existing = ghostMap.get(sale.product_name) || {
                name: sale.product_name,
                revenue_lost_potential: 0, // Cannot calculate profit without cost!
                quantity_sold: 0,
                last_sold: sale.date
            }
            // Logic: Total revenue is at risk because we don't know the margin
            existing.revenue_lost_potential += sale.revenue_total
            existing.quantity_sold += sale.quantity_sold
            if (sale.date > existing.last_sold) existing.last_sold = sale.date
            ghostMap.set(sale.product_name, existing)
        }
    })

    const ghostProducts = Array.from(ghostMap.values()).sort((a, b) => b.revenue_lost_potential - a.revenue_lost_potential)


    // 3. Calculate BCG Matrix Data
    // We need aggregation per product (recipe)
    const productStats = new Map<string, {
        id: string,
        name: string,
        totalQty: number,
        totalRevenue: number,
        totalCost: number,
        unitMargin: number
    }>()

    sales.forEach(sale => {
        if (sale.recipe_id && sale.recipes) {
            // Cast to expected shape (Supabase single-relation returns object, not array)
            const recipe = sale.recipes as unknown as { name: string; current_cost: number | null; selling_price: number | null }
            const cost = recipe.current_cost || 0

            // Standard join handling

            const existing = productStats.get(sale.recipe_id) || {
                id: sale.recipe_id,
                name: recipe.name,
                totalQty: 0,
                totalRevenue: 0,
                totalCost: 0,
                unitMargin: 0
            }

            existing.totalQty += sale.quantity_sold
            existing.totalRevenue += sale.revenue_total
            existing.totalCost += (cost * sale.quantity_sold)
            productStats.set(sale.recipe_id, existing)
        }
    })

    // Calculate Averages (Thresholds)
    let sumMargin = 0
    let sumQty = 0
    const items = Array.from(productStats.values())

    if (items.length === 0) return { bcg: null, ghosts: ghostProducts, kpis: null }

    items.forEach(item => {
        item.unitMargin = (item.totalRevenue - item.totalCost) / item.totalQty
        sumMargin += item.unitMargin
        sumQty += item.totalQty
    })

    const avgMargin = sumMargin / items.length
    const avgPopularity = sumQty / items.length

    // Classify
    const bcg: BCGMetrics = {
        stars: [],
        cows: [],
        dogs: [],
        puzzles: [],
        thresholds: { avgMargin, avgPopularity }
    }

    items.forEach(item => {
        const isHighMargin = item.unitMargin >= avgMargin
        const isHighPop = item.totalQty >= avgPopularity

        if (isHighPop && isHighMargin) bcg.stars.push(item)
        else if (isHighPop && !isHighMargin) bcg.cows.push(item)
        else if (!isHighPop && !isHighMargin) bcg.dogs.push(item)
        else bcg.puzzles.push(item)
    })

    return {
        bcg,
        ghosts: ghostProducts,
        kpis: {
            totalRevenue: items.reduce((acc, i) => acc + i.totalRevenue, 0),
            totalGhostRevenue: ghostProducts.reduce((acc, i) => acc + i.revenue_lost_potential, 0)
        }
    }
}
