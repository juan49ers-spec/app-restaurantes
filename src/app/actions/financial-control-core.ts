'use server'

import { createActionLogger } from '@/lib/logger'
import { createClient } from "@/lib/supabaseServer"
import { revalidatePath } from "next/cache"
import { DailySalesSchema, OperatingExpenseSchema, OperatingExpense, MonthlyTargetSchema, DailySales } from "@/types/schema"
import { z } from "zod"
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { getUserRestaurant } from "./utils"

const log = createActionLogger('financial-control-core')


// --- Daily Sales Actions ---

export async function getDailySales(restaurantId: string, date: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('daily_sales')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('date', date)
        .single()

    if (error && error.code !== 'PGRST116') {
        log.error({ err: error }, "Error fetching daily sales")
        throw new Error("Failed to fetch daily sales")
    }

    return data || null
}

export async function getDailySalesRange(restaurantId: string, startDate: string, endDate: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('daily_sales')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

    if (error) {
        log.error({ err: error }, "Error fetching daily sales range")
        throw new Error("Failed to fetch daily sales range")
    }

    return data || []
}

export async function upsertDailySales(formData: z.infer<typeof DailySalesSchema>) {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    if (!restaurantId) {
        return { success: false, error: "No hay restaurante activo para guardar ventas." }
    }

    // Validate input
    const validData = DailySalesSchema.parse(formData)

    // Calculate derived totals (server-side safety)
    const revenue_from_tax = (validData.base_10 || 0) + (validData.tax_10 || 0) +
        (validData.base_21 || 0) + (validData.tax_21 || 0)

    const revenue_from_channels = (validData.revenue_dine_in || 0) +
        (validData.revenue_takeout || 0) +
        (validData.revenue_delivery || 0)

    // Robust calculation: take the highest reliable signal to avoid data loss
    const revenue_total = Math.max(
        revenue_from_tax,
        revenue_from_channels,
        validData.revenue_total || 0
    )

    const iva_total = (validData.tax_10 || 0) + (validData.tax_21 || 0)

    const { data, error } = await supabase
        .from('daily_sales')
        .upsert({
            restaurant_id: restaurantId,
            date: validData.date,
            revenue_total,
            base_10: validData.base_10,
            tax_10: validData.tax_10,
            base_21: validData.base_21,
            tax_21: validData.tax_21,
            iva_collected: iva_total,
            revenue_dine_in: validData.revenue_dine_in,
            revenue_takeout: validData.revenue_takeout,
            revenue_delivery: validData.revenue_delivery,
            total_covers: validData.total_covers,
            labor_hours: validData.labor_hours,
            day_status: validData.day_status,
            cost_of_goods: validData.cost_of_goods,
            labor_cost: validData.labor_cost,
            source: 'manual_entry',
            updated_at: new Date().toISOString()
        }, { onConflict: 'restaurant_id, date' })
        .select()
        .single()

    if (error) {
        log.error({ err: error }, "Error upserting daily sales")
        return { success: false, error: error.message }
    }

    revalidatePath('/financial-control')
    revalidatePath('/') // Refresh Executive Dashboard
    revalidatePath('/dashboard') // Refresh if accessed via /dashboard alias
    return { success: true, data }
}

// --- Operating Expenses Actions ---

export async function getOperatingExpenses(restaurantId: string, startDate: string, endDate: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('operating_expenses')
        .select('id, restaurant_id, expense_date, category, amount, description, provider_detail, tag, payment_method, recurrence, is_paid, taxable_amount, tax_rate, tax_amount, withholding_rate, withholding_amount, is_professional_invoice')
        .eq('restaurant_id', restaurantId)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
        .order('expense_date', { ascending: false })

    if (error) {
        log.error({ err: error }, "Error fetching expenses")
        throw new Error("Failed to fetch expenses")
    }

    return data || []
}

export async function upsertOperatingExpense(formData: z.infer<typeof OperatingExpenseSchema>) {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    if (!restaurantId) {
        return { success: false, error: "No hay restaurante activo para guardar gastos." }
    }

    // Validate
    // Note: Schema expects string dates, but we might receive dates. Standardize if needed.
    const validData = OperatingExpenseSchema.parse(formData)

    const { data, error } = await supabase
        .from('operating_expenses')
        .insert({
            restaurant_id: restaurantId,
            expense_date: validData.expense_date,
            category: validData.category,
            amount: validData.amount,
            description: validData.description,
            provider_detail: validData.provider_detail,
            tag: validData.tag,
            payment_method: validData.payment_method,
            recurrence: validData.recurrence,
            is_paid: validData.is_paid,
            // Tax Fields
            taxable_amount: validData.taxable_amount,
            tax_rate: validData.tax_rate,
            tax_amount: validData.tax_amount,
            withholding_rate: validData.withholding_rate,
            withholding_amount: validData.withholding_amount,
            is_professional_invoice: validData.is_professional_invoice
        })
        .select()
        .single()

    if (error) {
        log.error({ err: error }, "Error upserting expense")
        return { success: false, error: error.message }
    }

    revalidatePath('/financial-control')
    return { success: true, data }
}

export async function deleteOperatingExpense(id: string) {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    if (!restaurantId) {
        return { success: false, error: "No hay restaurante activo para eliminar gastos." }
    }

    const { error } = await supabase
        .from('operating_expenses')
        .delete()
        .eq('id', id)
        .eq('restaurant_id', restaurantId)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/financial-control')
    revalidatePath('/')
    revalidatePath('/dashboard')
    return { success: true }
}

export async function updateOperatingExpense(id: string, updates: Partial<OperatingExpense>) {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    if (!restaurantId) {
        return { success: false, error: "No hay restaurante activo para actualizar gastos." }
    }

    const { restaurant_id: _ignoredRestaurantId, ...safeUpdates } = updates

    const { data, error } = await supabase
        .from('operating_expenses')
        .update(safeUpdates)
        .eq('id', id)
        .eq('restaurant_id', restaurantId)
        .select()
        .single()

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/financial-control')
    revalidatePath('/')
    revalidatePath('/dashboard')
    return { success: true, data }
}

export async function getBillingDashboardData(restaurantId: string, date: string) {
    const supabase = await createClient()
    const targetDate = new Date(date)

    // Calculate current and previous month ranges
    const currentStart = format(startOfMonth(targetDate), 'yyyy-MM-dd')
    const currentEnd = format(endOfMonth(targetDate), 'yyyy-MM-dd')

    const prevMonthDate = subMonths(targetDate, 1)
    const prevStart = format(startOfMonth(prevMonthDate), 'yyyy-MM-dd')
    const prevEnd = format(endOfMonth(prevMonthDate), 'yyyy-MM-dd')

    // Fetch both months in parallel
    const [currentMonth, prevMonth] = await Promise.all([
        supabase.from('daily_sales').select('*').eq('restaurant_id', restaurantId).gte('date', currentStart).lte('date', currentEnd).order('date', { ascending: true }),
        supabase.from('daily_sales').select('*').eq('restaurant_id', restaurantId).gte('date', prevStart).lte('date', prevEnd)
    ])

    if (currentMonth.error || prevMonth.error) throw new Error("Error fetching billing data")

    const sales = currentMonth.data || []
    const prevSales = prevMonth.data || []

    // Helper: Calculate Net Revenue (Base Imponible)
    const getNet = (s: DailySales) => (s?.revenue_total || 0) - (s?.iva_collected || 0)

    // KPI 1: Total Net Monthly
    const totalNetCurrent = sales.reduce((acc, s) => acc + getNet(s), 0)
    const totalNetPrev = prevSales.reduce((acc, s) => acc + getNet(s), 0)
    const momVariation = totalNetPrev > 0 ? ((totalNetCurrent - totalNetPrev) / totalNetPrev) * 100 : 0

    // KPI 2: Real Daily Average (Net_Revenue > 0)
    const operativeDaysCurrent = sales.filter(s => getNet(s) > 0)
    const avgDailyCurrent = operativeDaysCurrent.length > 0 ? totalNetCurrent / operativeDaysCurrent.length : 0

    const operativeDaysPrev = prevSales.filter(s => getNet(s) > 0)
    const avgDailyPrev = operativeDaysPrev.length > 0 ? totalNetPrev / operativeDaysPrev.length : 0
    const avgVariation = avgDailyPrev > 0 ? ((avgDailyCurrent - avgDailyPrev) / avgDailyPrev) * 100 : 0

    // KPI 3: Distribution
    const cashTotal = totalNetCurrent * 0.4 // Placeholder 40%
    const cardTotal = totalNetCurrent * 0.6 // Placeholder 60%

    return {
        stats: {
            totalNet: totalNetCurrent,
            momVariation,
            avgDaily: avgDailyCurrent,
            avgVariation,
            cashTotal,
            cardTotal,
            isFirstDay: operativeDaysCurrent.length === 0
        },
        dailyData: sales.map(s => ({
            date: s.date,
            netRevenue: getNet(s),
            totalRevenue: s.revenue_total,
            iva: s.iva_collected,
            status: s.day_status,
            // Placeholder for breakdown
            cash: getNet(s) * 0.4,
            card: getNet(s) * 0.6
        }))
    }
}

// --- Financial Hub Aggregation ---

export async function getFinancialHubData(restaurantId: string, startDate: string, endDate: string) {
    const supabase = await createClient()

    // 1. Fetch Daily Sales
    const { data: sales, error: salesError } = await supabase
        .from('daily_sales')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

    if (salesError) throw new Error("Failed to fetch sales data")

    // 2. Fetch Expenses
    const { data: expenses, error: expensesError } = await supabase
        .from('operating_expenses')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
        .order('expense_date', { ascending: true })

    if (expensesError) throw new Error("Failed to fetch expenses data")

    // 3. Calculate KPIs (Server-side aggregation)
    const totalRevenue = sales?.reduce((acc, day) => acc + (day.revenue_total || 0), 0) || 0
    const totalExpenses = expenses?.reduce((acc, exp) => acc + (exp.amount || 0), 0) || 0

    // Cost of Goods (COGS) - Derived from daily sales input
    const costOfGoods = sales?.reduce((acc, day) => acc + (day.cost_of_goods || 0), 0) || 0

    const theoreticalLabor = sales?.reduce((acc, day) => acc + ((day.labor_hours || 0) * 15), 0) || 0

    const laborCost = theoreticalLabor

    const primeCost = costOfGoods + laborCost

    return {
        sales: sales || [],
        expenses: expenses || [],
        kpis: {
            totalRevenue,
            totalExpenses,
            netProfit: totalRevenue - totalExpenses, // Strictly Cash Flow based on recorded expenses
            laborCost, // Operational KPI (Theoretical)
            costOfGoods, // Operational KPI (Theoretical)
            primeCost // Operational KPI
        }
    }
}

// --- Monthly Target Actions ---

export async function getMonthlyTarget(restaurantId: string, monthYear: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('monthly_targets')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('month_year', monthYear)
        .single()

    if (error && error.code !== 'PGRST116') {
        throw new Error("Failed to fetch targets")
    }

    return data || null
}

export async function upsertMonthlyTarget(formData: z.infer<typeof MonthlyTargetSchema>) {
    const supabase = await createClient()
    const restaurantId = await getUserRestaurant()

    if (!restaurantId) {
        return { success: false, error: "No hay restaurante activo para guardar objetivos." }
    }

    const validData = MonthlyTargetSchema.parse(formData)

    const { data, error } = await supabase
        .from('monthly_targets')
        .upsert({
            restaurant_id: restaurantId,
            month_year: validData.month_year,
            revenue_target: validData.revenue_target,
            cogs_target_pct: validData.cogs_target_pct,
            labor_target_pct: validData.labor_target_pct,
            updated_at: new Date().toISOString()
        }, { onConflict: 'restaurant_id, month_year' })
        .select()
        .single()

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/financial-control')
    return { success: true, data }
}

