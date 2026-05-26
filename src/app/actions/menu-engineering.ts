'use server'

import { createClient } from "@/lib/supabaseServer"
import { calculateMenuEngineeringAnalysis } from "@/lib/menu-engineering"
import { safeAction } from "./safe-action"
import { getUserRestaurant } from "./utils"
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

async function assertOwnedMenuReport(
    supabase: Awaited<ReturnType<typeof createClient>>,
    reportId: string,
    restaurantId: string
) {
    const { data: report, error } = await supabase
        .from('menu_reports')
        .select('id, restaurant_id')
        .eq('id', reportId)
        .eq('restaurant_id', restaurantId)
        .single()

    if (error || !report) {
        throw new Error('Menu report not found')
    }

    return report
}

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

export const updateReportItem = safeAction(UpdateItemInput, async (data, ctx) => {
    const supabase = await createClient()

    const { data: item, error: itemError } = await supabase
        .from('menu_report_items')
        .select('id, report_id')
        .eq('id', data.item_id)
        .single()

    if (itemError || !item) {
        throw new Error('Menu report item not found')
    }

    await assertOwnedMenuReport(supabase, item.report_id, ctx.restaurant_id)

    const { error } = await supabase
        .from('menu_report_items')
        .update({ quantity_sold: data.quantity_sold })
        .eq('id', data.item_id)
        .eq('report_id', item.report_id)

    if (error) throw new Error(error.message)

    return { success: true }
})

export const deleteReport = safeAction(z.object({ id: z.string().uuid() }), async (data, ctx) => {
    const supabase = await createClient()
    const { error } = await supabase
        .from('menu_reports')
        .delete()
        .eq('id', data.id)
        .eq('restaurant_id', ctx.restaurant_id)

    if (error) throw new Error(error.message)
    revalidatePath('/menu-engineering')
    return { success: true }
})

export const calculateMatrix = safeAction(z.object({ reportId: z.string().uuid() }), async (data, ctx) => {
    const supabase = await createClient()

    await assertOwnedMenuReport(supabase, data.reportId, ctx.restaurant_id)

    // 1. Fetch Items
    const { data: items, error: itemsError } = await supabase
        .from('menu_report_items')
        .select('*')
        .eq('report_id', data.reportId)

    if (itemsError || !items) throw new Error(itemsError?.message || "No items found")

    const analysis = calculateMenuEngineeringAnalysis(items.map((item) => ({
        id: item.id,
        report_id: item.report_id,
        recipe_id: item.recipe_id,
        quantity_sold: Number(item.quantity_sold),
        cost_per_unit: Number(item.cost_per_unit),
        price_per_unit: Number(item.price_per_unit),
    })))

    const updates = analysis.items.map((item) => ({
        id: item.id,
        report_id: item.report_id,
        recipe_id: item.recipe_id,
        quantity_sold: item.quantity_sold,
        cost_per_unit: item.cost_per_unit,
        price_per_unit: item.price_per_unit,
        classification: item.classification,
        popularity_pct: item.popularity_pct,
        contribution_margin: item.contribution_margin,
        total_sales: item.total_sales,
        total_cost: item.total_cost,
        total_profit: item.total_profit,
    }))

    const { error: updateItemsError } = await supabase
        .from('menu_report_items')
        .upsert(updates, { onConflict: 'id' })

    if (updateItemsError) {
        throw new Error(updateItemsError.message)
    }

    const { error: updateReportError } = await supabase.from('menu_reports')
        .update({
            status: 'ANALYZED',
            avg_popularity: analysis.thresholds.avgPopularityPct,
            avg_margin: analysis.thresholds.avgContributionMargin
        })
        .eq('id', data.reportId)
        .eq('restaurant_id', ctx.restaurant_id)

    if (updateReportError) {
        throw new Error(updateReportError.message)
    }

    revalidatePath(`/menu-engineering/${data.reportId}`)
    return { success: true }
})

export async function getMenuReports() {
    const restaurantId = await getUserRestaurant()
    if (!restaurantId) return []

    const supabase = await createClient()
    const { data } = await supabase
        .from('menu_reports')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })

    return data || []
}

export async function getMenuReport(id: string) {
    const restaurantId = await getUserRestaurant()
    if (!restaurantId) return null

    const supabase = await createClient()

    const { data: report, error } = await supabase
        .from('menu_reports')
        .select('*, items:menu_report_items(*, recipe:recipes(name))')
        .eq('id', id)
        .eq('restaurant_id', restaurantId)
        .single()

    if (error) {
        // Fallback: Try fetching just the report to see if it exists
        const { data: simpleReport, error: simpleError } = await supabase
            .from('menu_reports')
            .select('*')
            .eq('id', id)
            .eq('restaurant_id', restaurantId)
            .single()

        if (simpleError) {
            return null
        }

        return simpleReport
    }

    if (!report) {
        return null
    }

    return report
}
