'use server'

import { createClient } from "@/lib/supabaseServer"
import { getUserRestaurant } from "./utils"

interface BenchmarkData {
    ingredientId: string
    ingredientName: string
    category: string
    yourPrice: number
    marketAvg: number
    percentile: number // Lower is better for buyer
    savingsPotential: number // Monthly
    trend: 'above' | 'at' | 'below' // Relative to market
}

export async function getMarketBenchmarks(): Promise<BenchmarkData[]> {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    // Get your current prices
    const { data: yourIngredients } = await supabase
        .from('master_ingredients')
        .select('id, name, current_avg_price, category')
        .eq('restaurant_id', restaurantId)
        .gt('current_avg_price', 0)

    if (!yourIngredients) return []

    // In production, this would query aggregated anonymous data across restaurants
    // For now, we simulate market data with realistic variance
    const benchmarks: BenchmarkData[] = yourIngredients.map(ing => {
        const yourPrice = ing.current_avg_price || 0

        // Simulate market average with ±20% variance
        const variance = (Math.random() - 0.5) * 0.4
        const marketAvg = yourPrice * (1 + variance)

        // Calculate percentile (where you stand vs market)
        const percentile = yourPrice <= marketAvg ?
            Math.round((1 - (yourPrice / marketAvg)) * 50 + 50) :
            Math.round((marketAvg / yourPrice) * 50)

        // Trend relative to market
        const diff = yourPrice - marketAvg
        const trend: 'above' | 'at' | 'below' =
            diff > marketAvg * 0.05 ? 'above' :
                diff < -marketAvg * 0.05 ? 'below' : 'at'

        return {
            ingredientId: ing.id,
            ingredientName: ing.name,
            category: ing.category || 'General',
            yourPrice,
            marketAvg,
            percentile: Math.max(1, Math.min(99, percentile)),
            savingsPotential: yourPrice > marketAvg ? (yourPrice - marketAvg) * 12 : 0,
            trend
        }
    })

    // Sort by savings potential (descending), show only overpriced items
    return benchmarks
        .filter(b => b.savingsPotential > 0)
        .sort((a, b) => b.savingsPotential - a.savingsPotential)
        .slice(0, 10)
}

// Summary for dashboard
export async function getBenchmarkSummary(): Promise<{
    totalSavingsPotential: number
    itemsAboveMarket: number
    bestDeals: number
    topOpportunities: { name: string; savings: number }[]
}> {
    const benchmarks = await getMarketBenchmarks()

    return {
        totalSavingsPotential: benchmarks.reduce((acc, b) => acc + b.savingsPotential, 0),
        itemsAboveMarket: benchmarks.length,
        bestDeals: benchmarks.filter(b => b.percentile > 70).length,
        topOpportunities: benchmarks.slice(0, 3).map(b => ({
            name: b.ingredientName,
            savings: b.savingsPotential
        }))
    }
}
