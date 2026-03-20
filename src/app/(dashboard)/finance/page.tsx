
import { Suspense } from "react"
import { FinancialControlClient } from "./client"
import { getExpenseDashboardData } from "@/app/actions/financial-control"
import { getResultsDashboardData } from "@/app/actions/resultados"
import { getCurrentRestaurant } from "@/app/actions/user"
import { format } from "date-fns"
import { redirect } from "next/navigation"
import { FinancialHubLayout } from "@/components/financial-control/FinancialHubLayout"

interface PageProps {
    searchParams: Promise<{
        date?: string
        view?: string
    }>
}

export default async function FinancialControlPage({ searchParams }: PageProps) {
    const restaurant = await getCurrentRestaurant()

    if (!restaurant) {
        redirect("/")
    }

    const resolvedParams = await searchParams
    const dateStr = resolvedParams.date || format(new Date(), 'yyyy-MM-dd')
    const monthStr = format(new Date(dateStr), 'yyyy-MM')

    // Calculate month range for expenses context
    const dateObj = new Date(dateStr)

    // Fetch data in parallel (billing data is fetched client-side by BillingDashboard)
    const [expenseDashboardData, resultsData] = await Promise.all([
        getExpenseDashboardData(restaurant.id, monthStr),
        getResultsDashboardData(restaurant.id, dateObj.getFullYear(), dateObj.getMonth() + 1)
    ])

    return (
        <FinancialHubLayout>
            <Suspense fallback={<div className="p-8 text-center text-neutral-500">Cargando datos financieros del mes...</div>}>
                <FinancialControlClient
                    restaurantId={restaurant.id}
                    initialDate={dateStr}
                    expenseDashboardData={expenseDashboardData}
                    resultsData={resultsData}
                />
            </Suspense>
        </FinancialHubLayout>
    )
}
