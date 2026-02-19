'use server'

import { createClient } from "@/lib/supabaseServer"
import { safeAction } from "./safe-action"
import { z } from "zod"
import { revalidatePath } from "next/cache"

// Input Schemas
const CreateReportInput = z.object({
    name: z.string().min(1),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
})

const UpdateItemInput = z.object({
    item_id: z.string().uuid(),
    quantity_sold: z.number().min(0),
})

export const createMenuReport = safeAction(CreateReportInput, async (data, user) => {
    const supabase = await createClient()

    // 1. Create the Report (Draft)
    const { data: report, error: reportError } = await supabase
        .from('menu_reports')
        .insert({
            restaurant_id: user.restaurant_id,
            name: data.name,
            date_from: data.date_from,
            date_to: data.date_to,
            status: 'DRAFT'
        })
        .select()
        .single()

    if (reportError) throw new Error(reportError.message)

    // 2. Fetch all active recipes to snapshot
    const { data: recipes, error: recipesError } = await supabase
        .from('recipes')
        .select('id, current_cost, selling_price')
        .eq('restaurant_id', user.restaurant_id)

    if (recipesError) throw new Error(recipesError.message)

    if (!recipes || recipes.length === 0) return report

    // 3. [AUTOMATION] Fetch Agreggated Sales if dates are provided
    const salesMap = new Map<string, number>()

    if (data.date_from && data.date_to) {
        const { data: sales, error: salesError } = await supabase
            .from('daily_recipe_sales')
            .select('recipe_id, quantity_sold')
            .eq('restaurant_id', user.restaurant_id)
            .gte('date', data.date_from)
            .lte('date', data.date_to)

        if (!salesError && sales) {
            sales.forEach(sale => {
                const current = salesMap.get(sale.recipe_id) || 0
                salesMap.set(sale.recipe_id, current + sale.quantity_sold)
            })
        }
    }

    // 4. Create Report Items (Snapshots)
    const itemsToInsert = recipes.map(recipe => ({
        report_id: report.id,
        recipe_id: recipe.id,
        quantity_sold: salesMap.get(recipe.id) || 0, // Auto-populate from sales
        cost_per_unit: recipe.current_cost || 0,
        price_per_unit: recipe.selling_price || 0,
        classification: null // Not calculated yet
    }))

    const { error: itemsError } = await supabase
        .from('menu_report_items')
        .insert(itemsToInsert)

    if (itemsError) throw new Error(itemsError.message)

    revalidatePath('/menu-engineering')
    return report
})

export const updateReportItem = safeAction(UpdateItemInput, async (data, _user) => {
    const supabase = await createClient()

    const { error } = await supabase
        .from('menu_report_items')
        .update({ quantity_sold: data.quantity_sold })
        .eq('id', data.item_id)

    if (error) throw new Error(error.message)

    return { success: true }
})

export const deleteReport = safeAction(z.object({ id: z.string().uuid() }), async (data, _user) => {
    const supabase = await createClient()
    const { error } = await supabase.from('menu_reports').delete().eq('id', data.id)
    if (error) throw new Error(error.message)
    revalidatePath('/menu-engineering')
    return { success: true }
})

export const calculateMatrix = safeAction(z.object({ reportId: z.string().uuid() }), async (data, _user) => {
    const supabase = await createClient()

    // 1. Fetch Items
    const { data: items, error: itemsError } = await supabase
        .from('menu_report_items')
        .select('*')
        .eq('report_id', data.reportId)

    if (itemsError || !items) throw new Error(itemsError?.message || "No items found")

    // 2. Calculate Totals
    const totalSold = items.reduce((sum, item) => sum + Number(item.quantity_sold), 0)
    if (totalSold === 0) throw new Error("Total quantity sold is 0. Cannot calculate popularity.")

    const totalItems = items.length

    // 3. Calculate Thresholds
    // Popularity Threshold: (100% / Number of Items) * 70%
    const expectedMix = (1 / totalItems)
    const popularityThreshold = expectedMix * 0.7

    // Margin Threshold: Weighted Average Contribution Margin
    // Sum(Margin * Qty) / Total Qty
    let totalMarginGenerated = 0
    items.forEach(item => {
        const margin = Number(item.price_per_unit) - Number(item.cost_per_unit)
        totalMarginGenerated += margin * Number(item.quantity_sold)
    })
    const avgMarginThreshold = totalMarginGenerated / totalSold

    // 4. Classify Each Item
    const updates = items.map(item => {
        const margin = Number(item.price_per_unit) - Number(item.cost_per_unit)
        const popularityMix = Number(item.quantity_sold) / totalSold

        let classification = 'DOG'
        const isHighPop = popularityMix >= popularityThreshold
        const isHighMargin = margin >= avgMarginThreshold

        if (isHighPop && isHighMargin) classification = 'STAR'
        else if (isHighPop && !isHighMargin) classification = 'PLOWHORSE' // High Pop, Low Margin
        else if (!isHighPop && isHighMargin) classification = 'PUZZLE'   // Low Pop, High Margin
        else classification = 'DOG'

        return {
            id: item.id,
            classification,
            popularity_pct: popularityMix,
            contribution_margin: margin,
            total_sales: Number(item.price_per_unit) * Number(item.quantity_sold),
            total_cost: Number(item.cost_per_unit) * Number(item.quantity_sold),
            total_profit: margin * Number(item.quantity_sold)
        }
    })

    // 5. Bulk Update Items
    // Supabase doesn't support bulk update with different values easily in one query without RPC
    // For now, we'll do Promise.all (Parallel updates) - acceptable for <100 items menus
    const results = await Promise.all(updates.map(async (update) => {
        const { error } = await supabase.from('menu_report_items')
            .update({
                classification: update.classification,
                popularity_pct: update.popularity_pct,
                contribution_margin: update.contribution_margin,
                total_sales: update.total_sales,
                total_cost: update.total_cost,
                total_profit: update.total_profit
            })
            .eq('id', update.id)

        if (error) {
            console.error(`Failed to update item ${update.id}:`, error)
            return error.message
        }
        return null
    }))

    const errors = results.filter(e => e !== null)
    if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} items. First error: ${errors[0]}`)
    }

    // 6. Update Report Status & Averages
    await supabase.from('menu_reports')
        .update({
            status: 'ANALYZED',
            avg_popularity: popularityThreshold, // Store as decimal (0.05 not 5%)
            avg_margin: avgMarginThreshold
        })
        .eq('id', data.reportId)

    revalidatePath(`/menu-engineering/${data.reportId}`)
    return { success: true }
})

export async function getMenuReports() {
    const supabase = await createClient()
    const { data: user } = await supabase.auth.getUser()
    if (!user) return []

    // Get restaurant_id
    const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.user?.id)
        .single()

    if (!restaurant) return []

    const { data } = await supabase
        .from('menu_reports')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false })

    if (data) {
        console.log("getMenuReports found:", data.length, "reports")
        return data
    }
    console.log("getMenuReports found 0 reports")
    return []
}

export async function getMenuReport(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    console.log(`getMenuReport: Fetching for User ${user.id}, Report ${id}`)

    const { data: report, error } = await supabase
        .from('menu_reports')
        .select('*, items:menu_report_items(*, recipe:recipes(name))')
        .eq('id', id)
        .single()

    if (error) {
        console.error("getMenuReport JOIN Error:", JSON.stringify(error, null, 2))

        // Fallback: Try fetching just the report to see if it exists
        const { data: simpleReport, error: simpleError } = await supabase
            .from('menu_reports')
            .select('*')
            .eq('id', id)
            .single()

        if (simpleError) {
            console.error("getMenuReport SIMPLE Error:", JSON.stringify(simpleError, null, 2))
            return null
        }

        console.warn("Report exists but JOIN failed. Returning report without items.")
        return simpleReport
    }

    if (!report) {
        console.warn("getMenuReport: Report not found for ID", id)
        return null
    }

    return report
}
