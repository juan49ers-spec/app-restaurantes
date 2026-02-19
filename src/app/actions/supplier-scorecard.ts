'use server'

import { createClient } from "@/lib/supabaseServer"
import { getUserRestaurant } from "./utils"

interface SupplierMetrics {
    reliabilityScore: number
    trend: 'improving' | 'stable' | 'declining'
    totalOrders: number
    avgVariance: number
    onTimeRate: number
    totalSpend: number
    lastOrderDate: string | null
    scoreHistory: { date: string; score: number }[]
    comparisonRank: number
    totalSuppliers: number
}

export async function getSupplierScorecard(supplierId: string): Promise<SupplierMetrics> {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    // Parallel data fetching for performance
    const [invoicesResult, priceHistoryResult, allSuppliersResult] = await Promise.all([
        supabase
            .from('invoices')
            .select('id, total_amount, date, status')
            .eq('restaurant_id', restaurantId)
            .eq('supplier_id', supplierId)
            .eq('status', 'completed')
            .order('date', { ascending: false }),
        supabase
            .from('price_history')
            .select('variance_pct, recorded_at')
            .eq('restaurant_id', restaurantId)
            .eq('supplier_id', supplierId),
        supabase
            .from('suppliers')
            .select('id')
            .eq('restaurant_id', restaurantId)
    ])

    const invoices = invoicesResult.data || []
    const priceHistory = priceHistoryResult.data || []
    const totalSuppliers = allSuppliersResult.data?.length || 1

    // Calculate metrics
    const totalOrders = invoices.length
    const totalSpend = invoices.reduce((acc, i) => acc + (i.total_amount || 0), 0)
    const avgVariance = priceHistory.length
        ? priceHistory.reduce((acc, p) => acc + Math.abs(p.variance_pct || 0), 0) / priceHistory.length
        : 0

    // Score formula: 100 - (variance impact)
    const reliabilityScore = Math.max(0, Math.min(100, 100 - (avgVariance * 40)))

    // Generate score history (last 6 months)
    const scoreHistory = generateMonthlyScores(priceHistory)
    const trend = calculateTrend(scoreHistory)

    return {
        reliabilityScore: Math.round(reliabilityScore),
        trend,
        totalOrders,
        avgVariance: avgVariance * 100,
        onTimeRate: 0.95, // Placeholder - would need delivery tracking
        totalSpend,
        lastOrderDate: invoices[0]?.date || null,
        scoreHistory,
        comparisonRank: 1, // Would calculate vs other suppliers
        totalSuppliers
    }
}

function generateMonthlyScores(history: { variance_pct: number | null; recorded_at: string }[]) {
    const months = new Map<string, number[]>()
    history.forEach(h => {
        const month = h.recorded_at.substring(0, 7)
        const scores = months.get(month) || []
        scores.push(100 - Math.abs(h.variance_pct || 0) * 40)
        months.set(month, scores)
    })

    return Array.from(months.entries())
        .map(([date, scores]) => ({
            date,
            score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        }))
        .slice(-6)
}

function calculateTrend(history: { score: number }[]): 'improving' | 'stable' | 'declining' {
    if (history.length < 2) return 'stable'
    const recent = history.slice(-3)
    const older = history.slice(0, -3)
    const recentAvg = recent.reduce((a, b) => a + b.score, 0) / recent.length
    const olderAvg = older.length ? older.reduce((a, b) => a + b.score, 0) / older.length : recentAvg

    if (recentAvg - olderAvg > 5) return 'improving'
    if (olderAvg - recentAvg > 5) return 'declining'
    return 'stable'
}

// Get all supplier scores for comparison
export async function getAllSupplierScores(): Promise<{
    supplierId: string
    name: string
    score: number
    trend: 'improving' | 'stable' | 'declining'
    totalSpend: number
}[]> {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('restaurant_id', restaurantId)

    if (!suppliers) return []

    const scores = await Promise.all(
        suppliers.map(async (s) => {
            const metrics = await getSupplierScorecard(s.id)
            return {
                supplierId: s.id,
                name: s.name,
                score: metrics.reliabilityScore,
                trend: metrics.trend,
                totalSpend: metrics.totalSpend
            }
        })
    )

    return scores.sort((a, b) => b.score - a.score)
}
