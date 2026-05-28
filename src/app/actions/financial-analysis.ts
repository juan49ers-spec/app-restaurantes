'use server'

import { createClient } from "@/lib/supabaseServer"
import { OperatingExpense, OperatingExpenseCategory } from "@/types/schema"
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { TARGET_RATIOS, isPersonalCategory, isCOGSCategory, isInvestmentCategory } from "@/lib/financial-constants"
import { generateTopIncreaseCategories, generatePersonalVsTarget, generateCogsVsTarget, generateInsightSummary, calculateHistoryEntry, generateHistoryMonths } from "@/lib/financial-utils"


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
        prevAmount?: number
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
                prevAmount: cat.prevAmount,
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

    // Fetch 6 months history for sparklines — single query instead of 6 sequential ones
    const historyMonths = generateHistoryMonths(targetDate)
    const historyStart = historyMonths[0].start
    const historyEnd = historyMonths[historyMonths.length - 1].end

    const { data: allHistExpenses } = await supabase
        .from('operating_expenses')
        .select('expense_date, category, amount')
        .eq('restaurant_id', restaurantId)
        .gte('expense_date', historyStart)
        .lte('expense_date', historyEnd)

    const history: ExpenseDashboardData['history'] = historyMonths.map(({ month }) => {
        const monthExpenses = (allHistExpenses || []).filter(e =>
            e.expense_date.startsWith(month)
        )
        return calculateHistoryEntry(month, monthExpenses)
    })

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
        .select('base_10, base_21, iva_collected, tax_10, tax_21, revenue_total')
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

    // Fallback: si base_10/base_21 no están desglosados, calcular desde revenue_total - iva_collected
    const baseFromFields = sales?.reduce((sum, day) => sum + (day.base_10 || 0) + (day.base_21 || 0), 0) || 0
    const revenueTaxableBase = baseFromFields !== 0
        ? baseFromFields
        : sales?.reduce((sum, day) => sum + (day.revenue_total || 0) - (day.iva_collected || 0), 0) || 0

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

export interface QuarterlyFiscalData {
    pulseData: {
        ivaBalance: number;
        irpfTotal: number;
        daysRemaining: number;
    };
    ivaByMonth: {
        month: string;
        baseImponible: number;
        ivaDevengado: number;
        ivaDeducible: number;
    }[];
    irpfByConcept: {
        categoria: string;
        modelo: string;
        baseSujeta: number;
        porcentajeRetencion: number;
        cuotaIngresar: number;
    }[];
}

export async function getQuarterlyFiscalData(restaurantId: string, year: number, quarter: number): Promise<QuarterlyFiscalData> {
    const supabase = await createClient()

    const startMonth = (quarter - 1) * 3 + 1
    const endMonth = startMonth + 2

    const startDate = `${year}-${startMonth.toString().padStart(2, '0')}-01`
    const endDate = format(endOfMonth(new Date(`${year}-${endMonth.toString().padStart(2, '0')}-01`)), 'yyyy-MM-dd')

    // Fetch Sales
    const { data: sales, error: salesError } = await supabase
        .from('daily_sales')
        .select('date, base_10, base_21, iva_collected, tax_10, tax_21, revenue_total')
        .eq('restaurant_id', restaurantId)
        .gte('date', startDate)
        .lte('date', endDate)

    if (salesError) throw new Error("Failed to fetch sales fiscal data")

    // Fetch Expenses
    const { data: expenses, error: expensesError } = await supabase
        .from('operating_expenses')
        .select('expense_date, category, taxable_amount, tax_amount, withholding_amount, is_professional_invoice, withholding_rate')
        .eq('restaurant_id', restaurantId)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)

    if (expensesError) throw new Error("Failed to fetch expenses fiscal data")

    const safeSales = sales || []
    const safeExpenses = expenses || []

    const ivaByMonth = []
    let totalIvaDevengado = 0
    let totalIvaDeducible = 0
    let totalIrpf = 0

    // Month Logic
    for (let i = 0; i < 3; i++) {
        const currentMonthNum = startMonth + i
        const monthDate = new Date(year, currentMonthNum - 1, 1)
        const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(monthDate)
        const monthString = `${year}-${currentMonthNum.toString().padStart(2, '0')}`

        const monthlySales = safeSales.filter(s => s.date.startsWith(monthString))
        const monthlyExpenses = safeExpenses.filter(e => e.expense_date.startsWith(monthString))

        // Fallback robusto: si los campos desglosados (base_10/21, tax_10/21) están vacíos,
        // calcular desde revenue_total e iva_collected que sí tienen datos.
        const baseFromFields = monthlySales.reduce((sum, s) => sum + (s.base_10 || 0) + (s.base_21 || 0), 0)
        const baseImponible = baseFromFields !== 0
            ? baseFromFields
            : monthlySales.reduce((sum, s) => sum + (s.revenue_total || 0) - (s.iva_collected || 0), 0)

        const taxFromFields = monthlySales.reduce((sum, s) => sum + (s.tax_10 || 0) + (s.tax_21 || 0), 0)
        const ivaDevengado = taxFromFields > 0
            ? taxFromFields
            : monthlySales.reduce((sum, s) => sum + (s.iva_collected || 0), 0)

        const deductibleExpenses = monthlyExpenses.filter(e => e.is_professional_invoice || (e.tax_amount && e.tax_amount > 0))
        const ivaDeducible = deductibleExpenses.reduce((sum, e) => sum + (e.tax_amount || 0), 0)

        totalIvaDevengado += ivaDevengado
        totalIvaDeducible += ivaDeducible

        ivaByMonth.push({
            month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
            baseImponible,
            ivaDevengado,
            ivaDeducible
        })
    }

    // IRPF Concept grouping
    type IrpfConceptSummary = {
        categoria: string
        modelo: string
        baseSujeta: number
        porcentajeRetencion: number
        cuotaIngresar: number
        count: number
    }

    const irpfConceptsMap: Record<string, IrpfConceptSummary> = {
        "Nóminas": { categoria: "Nóminas", modelo: "Mod. 111", baseSujeta: 0, porcentajeRetencion: 0, cuotaIngresar: 0, count: 0 },
        "Alquiler": { categoria: "Alquiler", modelo: "Mod. 115", baseSujeta: 0, porcentajeRetencion: 0, cuotaIngresar: 0, count: 0 },
        "Profesionales": { categoria: "Profesionales", modelo: "Mod. 111", baseSujeta: 0, porcentajeRetencion: 0, cuotaIngresar: 0, count: 0 }
    }

    safeExpenses.forEach(exp => {
        if (exp.withholding_amount && exp.withholding_amount > 0) {
            totalIrpf += exp.withholding_amount

            let conceptKey = "Profesionales"
            if (exp.category === 'NOMINAS_LIQUIDAS') conceptKey = "Nóminas"
            if (exp.category === 'ALQUILER') conceptKey = "Alquiler"

            const target = irpfConceptsMap[conceptKey]
            target.baseSujeta += (exp.taxable_amount || 0)
            target.cuotaIngresar += exp.withholding_amount
            if (exp.withholding_rate) {
                target.porcentajeRetencion += exp.withholding_rate;
                target.count++;
            }
        }
    })

    const irpfByConcept = Object.values(irpfConceptsMap)
        .filter(c => c.cuotaIngresar > 0)
        .map(c => ({
            categoria: c.categoria,
            modelo: c.modelo,
            baseSujeta: c.baseSujeta,
            porcentajeRetencion: c.count > 0 ? Math.round(c.porcentajeRetencion / c.count) : (c.baseSujeta > 0 ? Math.round((c.cuotaIngresar / c.baseSujeta) * 100) : 0),
            cuotaIngresar: c.cuotaIngresar
        }))

    // Calculate Days Remaining securely:
    const today = new Date();
    // deadline is the 20th of the month following the quarter
    const deadlineDate = new Date(year, endMonth, 20);

    // Normalize to start of day
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);

    const diffTime = deadlineDate.getTime() - today.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    return {
        pulseData: {
            ivaBalance: totalIvaDevengado - totalIvaDeducible,
            irpfTotal: totalIrpf,
            daysRemaining
        },
        ivaByMonth,
        irpfByConcept
    }
}
