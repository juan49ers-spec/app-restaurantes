'use server'

import { createClient } from "@/lib/supabaseServer"
import { revalidatePath } from "next/cache"
import { DailySalesSchema, DailySales, OperatingExpenseSchema, OperatingExpense, MonthlyTargetSchema, OperatingExpenseCategory } from "@/types/schema"
import { z } from "zod"
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { TARGET_RATIOS, isPersonalCategory, isCOGSCategory, isInvestmentCategory } from "@/lib/financial-constants"
import {
    generateTopIncreaseCategories,
    generatePersonalVsTarget,
    generateCogsVsTarget,
    generateInsightSummary,
    calculateHistoryEntry,
    generateHistoryMonths
} from "@/lib/financial-utils"

// --- Daily Sales Actions ---

export async function getDailySales(restaurantId: string, date: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('daily_sales')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('date', date)
        .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows returned"
        console.error("Error fetching daily sales:", error)
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
        console.error("Error fetching daily sales range:", error)
        throw new Error("Failed to fetch daily sales range")
    }

    return data || []
}

export async function upsertDailySales(formData: z.infer<typeof DailySalesSchema>) {
    const supabase = await createClient()

    // Validate input
    const validData = DailySalesSchema.parse(formData)

    // Calculate derived totals (server-side safety)
    const revenue_total = (validData.base_10 || 0) + (validData.tax_10 || 0) +
        (validData.base_21 || 0) + (validData.tax_21 || 0)

    const iva_total = (validData.tax_10 || 0) + (validData.tax_21 || 0)

    const { data, error } = await supabase
        .from('daily_sales')
        .upsert({
            restaurant_id: validData.restaurant_id,
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
            source: 'manual_entry',
            updated_at: new Date().toISOString()
        }, { onConflict: 'restaurant_id, date' })
        .select()
        .single()

    if (error) {
        console.error("Error upserting daily sales:", error)
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
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
        .order('expense_date', { ascending: false })

    if (error) {
        console.error("Error fetching expenses:", error)
        throw new Error("Failed to fetch expenses")
    }

    return data || []
}

export async function upsertOperatingExpense(formData: z.infer<typeof OperatingExpenseSchema>) {
    const supabase = await createClient()

    // Validate
    // Note: Schema expects string dates, but we might receive dates. Standardize if needed.
    const validData = OperatingExpenseSchema.parse(formData)

    const { data, error } = await supabase
        .from('operating_expenses')
        .insert({
            restaurant_id: validData.restaurant_id,
            expense_date: validData.expense_date,
            category: validData.category,
            amount: validData.amount,
            description: validData.description,
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
        console.error("Error upserting expense:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/financial-control')
    return { success: true, data }
}

export async function deleteOperatingExpense(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('operating_expenses')
        .delete()
        .eq('id', id)

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

    const { data, error } = await supabase
        .from('operating_expenses')
        .update(updates)
        .eq('id', id)
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
    const validData = MonthlyTargetSchema.parse(formData)

    const { data, error } = await supabase
        .from('monthly_targets')
        .upsert({
            restaurant_id: validData.restaurant_id,
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

// --- EXPENSE DASHBOARD ACTIONS (GASTOS Module) ---

export interface ExpenseDashboardData {
    kpis: {
        totalExpenses: number
        totalExpensesExcludingCAPEX: number
        totalCashFlow: number
        momVariation: number
        expenseToSalesRatio: number
        personalRatio: number
        cogsRatio: number
    }
    categories: {
        category: OperatingExpenseCategory
        amount: number
        weight: number
        momVariation: number
        ratioToSales: number
        ratioToTarget: number
        theoreticalTarget: number
        expenses: OperatingExpense[]
        tags: Record<string, number>
    }[]
    insight: {
        summary: string
        topIncreaseCategories: string[]
        personalVsTarget: string
        cogsVsTarget: string
        editable: boolean
    }
    history: {
        month: string
        total: number
        byCategory: Record<string, number>
    }[]
}

// Helper functions for expense calculations
function groupExpensesByCategory(expenses: OperatingExpense[]) {
    const groups: Record<string, OperatingExpense[]> = {}
    expenses.forEach(exp => {
        if (!groups[exp.category]) {
            groups[exp.category] = []
        }
        groups[exp.category].push(exp)
    })
    return groups
}

function calculateCategoryRatios(
    categoryTotals: { category: string; amount: number }[],
    totalNetSales: number
) {
    const personalTotal = categoryTotals
        .filter(cat => isPersonalCategory(cat.category))
        .reduce((sum, cat) => sum + cat.amount, 0)

    const personalRatio = totalNetSales > 0 ? (personalTotal / totalNetSales) * 100 : 0

    const cogsTotal = categoryTotals
        .filter(cat => isCOGSCategory(cat.category))
        .reduce((sum, cat) => sum + cat.amount, 0)

    const cogsRatio = totalNetSales > 0 ? (cogsTotal / totalNetSales) * 100 : 0

    return { personalTotal, personalRatio, cogsTotal, cogsRatio }
}

function getTheoreticalTargetForCategory(category: string): number {
    if (isPersonalCategory(category)) {
        return TARGET_RATIOS.PERSONAL_TARGET_PCT
    }
    if (isCOGSCategory(category)) {
        return TARGET_RATIOS.COGS_TARGET_PCT
    }
    return 0 // Rest: Variable (no specific target)
}

export async function getExpenseDashboardData(
    restaurantId: string,
    currentMonth: string // YYYY-MM
): Promise<ExpenseDashboardData> {
    const supabase = await createClient()

    // Calculate date ranges for current and previous month
    const targetDate = new Date(currentMonth + '-01')
    const currentStart = format(startOfMonth(targetDate), 'yyyy-MM-dd')
    const currentEnd = format(endOfMonth(targetDate), 'yyyy-MM-dd')

    const prevMonthDate = subMonths(targetDate, 1)
    const prevStart = format(startOfMonth(prevMonthDate), 'yyyy-MM-dd')
    const prevEnd = format(endOfMonth(prevMonthDate), 'yyyy-MM-dd')

    // Fetch expenses for both months
    const [currentMonthExpenses, prevMonthExpenses, salesData] = await Promise.all([
        supabase
            .from('operating_expenses')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .gte('expense_date', currentStart)
            .lte('expense_date', currentEnd)
            .order('expense_date', { ascending: true }),
        supabase
            .from('operating_expenses')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .gte('expense_date', prevStart)
            .lte('expense_date', prevEnd),
        supabase
            .from('daily_sales')
            .select('revenue_total, iva_collected')
            .eq('restaurant_id', restaurantId)
            .gte('date', currentStart)
            .lte('date', currentEnd)
    ])

    if (currentMonthExpenses.error) throw new Error('Failed to fetch current expenses')
    if (prevMonthExpenses.error) throw new Error('Failed to fetch previous expenses')
    if (salesData.error) throw new Error('Failed to fetch sales data')

    const currentExpenses = currentMonthExpenses.data || []
    const prevExpenses = prevMonthExpenses.data || []
    const sales = salesData.data || []

    // Calculate total net sales (Base Imponible)
    const totalNetSales = sales.reduce((sum, s) => {
        return sum + (s.revenue_total || 0) - (s.iva_collected || 0)
    }, 0)

    // Group expenses by category
    const currentGroups = groupExpensesByCategory(currentExpenses)
    const prevGroups = groupExpensesByCategory(prevExpenses)

    // Calculate totals per category
    const categoryTotals = Object.keys(currentGroups).map(category => {
        const amount = currentGroups[category].reduce((sum, exp) => sum + (exp.amount || 0), 0)
        const prevAmount = prevGroups[category]?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0
        return {
            category,
            amount,
            prevAmount,
            expenses: currentGroups[category]
        }
    })

    // Calculate KPIs
    const totalExpenses = categoryTotals.reduce((sum, cat) => sum + cat.amount, 0)
    const totalExpensesExcludingCAPEX = categoryTotals
        .filter(cat => !isInvestmentCategory(cat.category))
        .reduce((sum, cat) => sum + cat.amount, 0)

    const totalPrevExpenses = Object.values(prevGroups).flat().reduce((sum, exp) => sum + (exp.amount || 0), 0)
    const momVariation = totalPrevExpenses > 0
        ? ((totalExpenses - totalPrevExpenses) / totalPrevExpenses) * 100
        : 0

    const expenseToSalesRatio = totalNetSales > 0
        ? (totalExpensesExcludingCAPEX / totalNetSales) * 100
        : 0

    // Calculate Personal and COGS ratios using helper function
    const { personalRatio, cogsRatio } = calculateCategoryRatios(categoryTotals, totalNetSales)

    // Build category data with Pareto ordering (highest to lowest)
    const categories = categoryTotals
        .map(cat => {
            const weight = totalExpenses !== 0 ? (cat.amount / totalExpenses) * 100 : 0
            const ratioToSales = totalNetSales > 0 ? (cat.amount / totalNetSales) * 100 : 0

            // Determine theoretical target based on category
            const theoreticalTarget = getTheoreticalTargetForCategory(cat.category)

            return {
                category: cat.category as OperatingExpenseCategory,
                amount: cat.amount,
                weight,
                momVariation: cat.prevAmount > 0 ? ((cat.amount - cat.prevAmount) / cat.prevAmount) * 100 : 0,
                ratioToSales,
                ratioToTarget: theoreticalTarget > 0 ? ratioToSales - theoreticalTarget : 0,
                theoreticalTarget,
                expenses: cat.expenses,
                tags: cat.expenses.reduce((acc, exp) => {
                    const key = (isCOGSCategory(cat.category) ? exp.tag : exp.provider_detail) || exp.description || 'Otros'
                    const safeKey = key || 'Otros'
                    acc[safeKey] = (acc[safeKey] || 0) + (exp.amount || 0)
                    return acc
                }, {} as Record<string, number>)
            }
        })
        .sort((a, b) => b.amount - a.amount) // Pareto: highest to lowest

    // Generate AI Insight using extracted functions
    const topIncreaseCategories = generateTopIncreaseCategories(categories)
    const personalVsTarget = generatePersonalVsTarget(personalRatio)
    const cogsVsTarget = generateCogsVsTarget(cogsRatio)
    const summary = generateInsightSummary(momVariation, topIncreaseCategories, personalVsTarget, cogsVsTarget)

    const insight = {
        summary,
        topIncreaseCategories,
        personalVsTarget,
        cogsVsTarget,
        editable: true
    }

    // Fetch 6 months history for sparklines using extracted functions
    const history: ExpenseDashboardData['history'] = []
    const historyMonths = generateHistoryMonths(targetDate)

    for (const { month, start, end } of historyMonths) {
        const { data: histExpenses } = await supabase
            .from('operating_expenses')
            .select('category, amount')
            .eq('restaurant_id', restaurantId)
            .gte('expense_date', start)
            .lte('expense_date', end)

        if (histExpenses) {
            history.push(calculateHistoryEntry(month, histExpenses))
        }
    }

    return {
        kpis: {
            totalExpenses,
            totalExpensesExcludingCAPEX,
            totalCashFlow: totalExpenses, // All money out
            momVariation,
            expenseToSalesRatio,
            personalRatio,
            cogsRatio
        },
        categories,
        insight,
        history
    }
}

// --- Fiscal Engine Actions (Professional Module) ---

export interface FiscalMetrics {
    ivaCollected: number
    ivaDeductible: number
    irpfWithheld: number
    netTaxPayable: number
    revenueTaxableBase: number
    expensesTaxableBase: number
}

export async function getFiscalMetrics(restaurantId: string, startDate: string, endDate: string): Promise<FiscalMetrics> {
    const supabase = await createClient()

    // 1. Fetch Sales (IVA Repercutido)
    const { data: sales, error: salesError } = await supabase
        .from('daily_sales')
        .select('base_10, base_21, iva_collected, tax_10, tax_21')
        .eq('restaurant_id', restaurantId)
        .gte('date', startDate)
        .lte('date', endDate)

    if (salesError) throw new Error("Failed to fetch sales fiscal data")

    // 2. Fetch Expenses (IVA Soportado / IRPF)
    const { data: expenses, error: expensesError } = await supabase
        .from('operating_expenses')
        .select('taxable_amount, tax_amount, withholding_amount, is_professional_invoice')
        .eq('restaurant_id', restaurantId)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)

    if (expensesError) throw new Error("Failed to fetch expenses fiscal data")

    // 3. Aggregation Logic
    const ivaCollected = sales?.reduce((sum, day) => sum + (day.iva_collected || 0), 0) || 0
    const revenueTaxableBase = sales?.reduce((sum, day) => sum + (day.base_10 || 0) + (day.base_21 || 0), 0) || 0

    // Filter for valid deductible expenses (Professional Invoice OR Explicit Tax Amount)
    const deductibleExpenses = expenses?.filter(e => e.is_professional_invoice || (e.tax_amount && e.tax_amount > 0)) || []

    const ivaDeductible = deductibleExpenses.reduce((sum, exp) => sum + (exp.tax_amount || 0), 0)
    const expensesTaxableBase = deductibleExpenses.reduce((sum, exp) => sum + (exp.taxable_amount || 0), 0)

    // IRPF is calculated on ALL expenses that have it (usually professional services or rent)
    const irpfWithheld = expenses?.reduce((sum, exp) => sum + (exp.withholding_amount || 0), 0) || 0

    return {
        ivaCollected,
        ivaDeductible,
        irpfWithheld,
        netTaxPayable: ivaCollected - ivaDeductible,
        revenueTaxableBase,
        expensesTaxableBase
    }
}
