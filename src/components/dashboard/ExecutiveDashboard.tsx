
import { Suspense } from 'react'
import { DateRange } from "react-day-picker"
import { subDays } from "date-fns"
import { getFinancialDiagnosis } from "@/app/actions/financial-diagnosis"
import { getFinancialPulse } from "@/app/actions/financial-engine"
import { getStaffEfficiency } from "@/app/actions/staff-optimization"
import { getCurrentRestaurant } from "@/app/actions/user"
import { ExecutiveDashboardClient } from "./ExecutiveDashboardClient"
import { DashboardSkeleton } from "./DashboardSkeleton"

interface ExecutiveDashboardProps {
    searchParams?: {
        from?: string
        to?: string
    }
}

export async function ExecutiveDashboard({ searchParams }: ExecutiveDashboardProps) {
    // 1. Resolve Date Range (Server Side)
    const today = new Date()
    const defaultFrom = subDays(today, 30)

    // Parse URL params or use defaults
    const from = searchParams?.from ? new Date(searchParams.from) : defaultFrom
    const to = searchParams?.to ? new Date(searchParams.to) : today

    const dateRange: DateRange = { from, to }

    // 2. Fetch User & Restaurant Context
    const restaurant = await getCurrentRestaurant()

    const kpisCalculados = {
        totalExpenses: 0,
        totalExpensesExcludingCAPEX: 0,
        totalCashFlow: 0,
        momVariation: 0,
        expenseToSalesRatio: 0,
        personalRatio: 0,
        cogsRatio: 0
    }

    if (!restaurant) {
        return <ExecutiveDashboardClient
            initialDateRange={dateRange}
            initialData={{
                financial: null,
                engine: null,
                staff: null
            }}
            missingRestaurant={true}
        />
    }

    // 3. fetch data in parallel (Waterfall elimination) with Zero-Crash policy
    const startDateIso = from.toISOString().split('T')[0]
    const endDateIso = to.toISOString().split('T')[0]

    const results = await Promise.allSettled([
        getFinancialDiagnosis(restaurant.id, startDateIso, endDateIso),
        getFinancialPulse(restaurant.id, from.toISOString(), to.toISOString()),
        getStaffEfficiency(restaurant.id, startDateIso, endDateIso)
    ])

    const financial = results[0].status === 'fulfilled' ? results[0].value : null
    const engine = results[1].status === 'fulfilled' ? results[1].value : null
    const staff = results[2].status === 'fulfilled' ? results[2].value : null

    // Log failures silently to server console for debugging without crashing UI
    if (results[0].status === 'rejected') console.error('Financial Diagnosis Failed:', results[0].reason)
    if (results[1].status === 'rejected') console.error('Financial Pulse Failed:', results[1].reason)
    if (results[2].status === 'rejected') console.error('Staff Efficiency Failed:', results[2].reason)

    if (financial && financial.metrics) {
        const metrics = financial.metrics
        const totalRevenue = metrics.totalRevenue || 0

        kpisCalculados.personalRatio = totalRevenue > 0
            ? (metrics.totalLaborCost / totalRevenue) * 100
            : 0
        kpisCalculados.cogsRatio = totalRevenue > 0
            ? (metrics.totalFoodCost / totalRevenue) * 100
            : 0
        kpisCalculados.totalExpenses = metrics.totalLaborCost + metrics.totalFoodCost
        kpisCalculados.expenseToSalesRatio = totalRevenue > 0
            ? (kpisCalculados.totalExpenses / totalRevenue) * 100
            : 0
        kpisCalculados.totalCashFlow = metrics.netProfit
    }

    // 4. Render Client Component with Hydrated Data (Safe Partial Render)
    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <ExecutiveDashboardClient
                initialDateRange={dateRange}
                initialData={{
                    financial,
                    engine,
                    staff,
                }}
                missingRestaurant={false}
            />
        </Suspense>
    )
}
