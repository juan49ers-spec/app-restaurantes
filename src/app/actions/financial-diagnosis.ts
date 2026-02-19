'use server'

import { createClient } from "@/lib/supabaseServer"
import { startOfMonth, endOfMonth, subMonths } from "date-fns"
import { DailySales } from "@/types/schema"

export interface FinancialDiagnosis {
    period: { start: string; end: string }
    metrics: {
        totalRevenue: number
        totalFoodCost: number
        totalLaborCost: number
        grossMargin: number
        grossMarginPct: number
        netProfit: number
        netProfitPct: number
        // Tax Metrics
        ivaCollected: number
        ivaDeductible: number
        irpfWithheld: number
    }
    trends: {
        revenueGrowth: number // vs last month
        marginChange: number // vs last month
    }
    dailyData: DailySales[]
}

export async function getFinancialDiagnosis(
    restaurantId: string,
    startDate?: string,
    endDate?: string
): Promise<FinancialDiagnosis> {
    const supabase = await createClient()
    const now = new Date()

    // Default to current month if no dates provided
    const start = startDate ? new Date(startDate) : startOfMonth(now)
    const end = endDate ? new Date(endDate) : endOfMonth(now)

    // 1. Fetch Daily Sales for current period
    const { data: salesData, error } = await supabase
        .from('daily_sales')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('date', start.toISOString().split('T')[0])
        .lte('date', end.toISOString().split('T')[0])
        .order('date', { ascending: true })

    if (error) throw error

    // 2. Fetch Daily Sales for previous period (for trends)
    const prevStart = subMonths(start, 1)
    const prevEnd = subMonths(end, 1)

    const { data: prevSalesData } = await supabase
        .from('daily_sales')
        .select('revenue_total, cost_of_goods')
        .eq('restaurant_id', restaurantId)
        .gte('date', prevStart.toISOString().split('T')[0])
        .lte('date', prevEnd.toISOString().split('T')[0])

    // 4. Fetch Operating Expenses for current period
    const { data: expenses } = await supabase
        .from('operating_expenses')
        .select('amount, tax_amount, withholding_amount')
        .eq('restaurant_id', restaurantId)
        .gte('expense_date', start.toISOString().split('T')[0])
        .lte('expense_date', end.toISOString().split('T')[0])

    const totalOperatingExpenses = expenses?.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0) || 0

    // Tax Aggregation
    const totalIvaPaid = expenses?.reduce((sum, exp) => sum + (Number(exp.tax_amount) || 0), 0) || 0
    const totalIrpfWithheld = expenses?.reduce((sum, exp) => sum + (Number(exp.withholding_amount) || 0), 0) || 0

    // 5. Aggregate Metrics
    const aggregate = (data: Partial<DailySales>[]) => {
        return data.reduce((acc, day) => ({
            revenue: acc.revenue + (day.revenue_total || 0),
            foodCost: acc.foodCost + (day.cost_of_goods || 0),
            laborCost: acc.laborCost + ((day.labor_hours || 0) * 15), // Fallback to 15e/hr if no stored cost
            ivaCollected: acc.ivaCollected + (day.iva_collected || 0)
        }), { revenue: 0, foodCost: 0, laborCost: 0, ivaCollected: 0 })
    }

    const current = aggregate(salesData || [])
    const previous = aggregate(prevSalesData || [])

    // Net Profit Strategy:
    // Strictly Cash Flow: Revenue - Total Invoiced Expenses (Operating Expenses).
    const netProfit = current.revenue - totalOperatingExpenses

    // Gross Margin (Theoretical): Revenue - Theoretical Food Cost
    const grossMargin = current.revenue - current.foodCost

    // Avoid division by zero
    const grossMarginPct = current.revenue > 0 ? (grossMargin / current.revenue) * 100 : 0
    const netProfitPct = current.revenue > 0 ? (netProfit / current.revenue) * 100 : 0

    // Trends
    const revenueGrowth = previous.revenue > 0
        ? ((current.revenue - previous.revenue) / previous.revenue) * 100
        : 0

    const prevGrossMargin = previous.revenue - previous.foodCost
    const prevGrossMarginPct = previous.revenue > 0 ? (prevGrossMargin / previous.revenue) * 100 : 0
    const marginChange = grossMarginPct - prevGrossMarginPct

    return {
        period: {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        },
        metrics: {
            totalRevenue: current.revenue,
            totalFoodCost: current.foodCost,
            totalLaborCost: current.laborCost,
            grossMargin: grossMargin,
            grossMarginPct: Number(grossMarginPct.toFixed(1)),
            netProfit: netProfit,
            netProfitPct: Number(netProfitPct.toFixed(1)),
            // Tax Metrics
            ivaCollected: current.ivaCollected,
            ivaDeductible: totalIvaPaid,
            irpfWithheld: totalIrpfWithheld
        },
        trends: {
            revenueGrowth: Number(revenueGrowth.toFixed(1)),
            marginChange: Number(marginChange.toFixed(1))
        },
        dailyData: salesData || []
    }
}
