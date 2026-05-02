'use server'

import { createClient } from "@/lib/supabaseServer"
import { verifyRestaurantAccess } from "@/lib/verify-access"
import { revalidatePath } from "next/cache"

export async function seedRobustSalesData(restaurantId: string) {
    await verifyRestaurantAccess(restaurantId)
    const supabase = await createClient()

    // 1. Define simulation parameters
    const DAYS_TO_SIMULATE = 30
    const BASE_REVENUE = 1500 // Average daily revenue
    const REVENUE_VARIANCE = 500 // +/- variance
    const FOOD_COST_TARGET = 0.30 // 30%
    const FOOD_COST_VARIANCE = 0.05 // +/- 5%
    const LABOR_COST_TARGET = 0.35 // 35%
    const LABOR_COST_VARIANCE = 0.05 // +/- 5%

    const dataToInsert = []
    const today = new Date()

    // 2. Generate data for past 30 days
    for (let i = 0; i < DAYS_TO_SIMULATE; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]

        // Revenue: Random between (Base - Var) and (Base + Var)
        // Add weekend multiplier (Fri/Sat = 1.5x)
        const dayOfWeek = date.getDay()
        let weekendMultiplier = 1
        if (dayOfWeek === 5 || dayOfWeek === 6) weekendMultiplier = 1.4
        if (dayOfWeek === 0) weekendMultiplier = 1.2 // Sunday

        const dailyRevenue = (BASE_REVENUE + (Math.random() - 0.5) * 2 * REVENUE_VARIANCE) * weekendMultiplier

        // Breakdown (Dine-in ~60%, Takeout ~25%, Delivery ~15%)
        const dineInShare = 0.55 + (Math.random() * 0.15) // 55-70%
        const takeoutShare = 0.20 + (Math.random() * 0.10) // 20-30%
        const deliveryShare = 1 - dineInShare - takeoutShare // Remainder

        const revenue_dine_in = dailyRevenue * dineInShare
        const revenue_takeout = dailyRevenue * takeoutShare
        const revenue_delivery = dailyRevenue * deliveryShare

        // Metrics
        const avgTicket = 22 + (Math.random() * 8) // 22-30 EUR
        const totalCovers = Math.round(dailyRevenue / avgTicket)

        // Food Cost: Target +/- Variance
        const foodCostPct = FOOD_COST_TARGET + (Math.random() - 0.5) * 2 * FOOD_COST_VARIANCE
        const costOfGoods = dailyRevenue * foodCostPct

        // Labor Cost: Target +/- Variance
        const laborCostPct = LABOR_COST_TARGET + (Math.random() - 0.5) * 2 * LABOR_COST_VARIANCE
        const laborCost = dailyRevenue * laborCostPct

        dataToInsert.push({
            restaurant_id: restaurantId,
            date: dateStr,
            revenue_total: Number(dailyRevenue.toFixed(2)),
            revenue_dine_in: Number(revenue_dine_in.toFixed(2)),
            revenue_takeout: Number(revenue_takeout.toFixed(2)),
            revenue_delivery: Number(revenue_delivery.toFixed(2)),
            total_covers: totalCovers,
            labor_hours: Math.round(laborCost / 15), // Approx 15/hr
            cost_of_goods: Number(costOfGoods.toFixed(2)),
            labor_cost: Number(laborCost.toFixed(2)),
            source: 'seed_robust'
        })
    }

    // 3. Clear existing seed data to avoid duplicates (optional, strictly speaking we have unique constraint)
    // We'll use upsert to handle conflicts
    const { error } = await supabase
        .from('daily_sales')
        .upsert(dataToInsert, { onConflict: 'restaurant_id, date' })

    if (error) {
        console.error("Error seeding sales:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/dashboard')
    return {
        success: true,
        daysSeeded: DAYS_TO_SIMULATE,
        message: "Successfully seeded 30 days of robust financial data."
    }
}
