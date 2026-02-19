
import { Suspense } from "react"
import { FinancialControlClient } from "./client"
import { getDailySales, getOperatingExpenses, getBillingDashboardData, getExpenseDashboardData } from "@/app/actions/financial-control"
import { getResultsDashboardData } from "@/app/actions/resultados"
import { getCurrentRestaurant } from "@/app/actions/user"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { redirect } from "next/navigation"

interface PageProps {
    searchParams: {
        date?: string
        view?: string
    }
}

export default async function FinancialControlPage({ searchParams }: PageProps) {
    const restaurant = await getCurrentRestaurant()
    
    if (!restaurant) {
        redirect("/")
    }
    
    const dateStr = searchParams.date || format(new Date(), 'yyyy-MM-dd')
    const monthStr = format(new Date(dateStr), 'yyyy-MM')
    
    // Calculate month range for expenses context
    const dateObj = new Date(dateStr)
    const monthStart = format(startOfMonth(dateObj), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(dateObj), 'yyyy-MM-dd')
    
    // Fetch data in parallel
    const [dailySales, expenses, billingData, expenseDashboardData, resultsData] = await Promise.all([
        getDailySales(restaurant.id, dateStr),
        getOperatingExpenses(restaurant.id, monthStart, monthEnd),
        getBillingDashboardData(restaurant.id, dateStr),
        getExpenseDashboardData(restaurant.id, monthStr),
        getResultsDashboardData(restaurant.id, dateObj.getFullYear(), dateObj.getMonth() + 1)
    ])
    
    return (
        <Suspense fallback={<div className="p-8 text-center text-neutral-500">Cargando datos financieros del mes...</div>}>
            <FinancialControlClient
                restaurantId={restaurant.id}
                initialDate={dateStr}
                initialDailySales={dailySales}
                initialExpenses={expenses}
                billingData={billingData}
                expenseDashboardData={expenseDashboardData}
                resultsData={resultsData}
            />
        </Suspense>
    )
}
