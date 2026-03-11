
import { Suspense } from "react"
import { FinancialControlClient } from "@/app/(dashboard)/finance/client"
import { getDailySales, getOperatingExpenses, getBillingDashboardData } from "@/app/actions/financial-control"
import { getCurrentRestaurant } from "@/app/actions/user"
import { format, startOfMonth, endOfMonth } from "date-fns"

interface FinancialControlSectionProps {
    searchParams: {
        date?: string
    }
}

export async function FinancialControlSection({ searchParams }: FinancialControlSectionProps) {
    const restaurant = await getCurrentRestaurant()

    if (!restaurant) {
        return <div className="p-8 text-center text-red-500 font-bold bg-white rounded-2xl shadow-sm border border-neutral-100">Sesión expirada o restaurante no encontrado.</div>
    }

    const dateStr = searchParams.date || format(new Date(), 'yyyy-MM-dd')
    const dateObj = new Date(dateStr)
    const monthStart = format(startOfMonth(dateObj), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(dateObj), 'yyyy-MM-dd')

    const [dailySales, expenses, billingData] = await Promise.all([
        getDailySales(restaurant.id, dateStr),
        getOperatingExpenses(restaurant.id, monthStart, monthEnd),
        getBillingDashboardData(restaurant.id, dateStr)
    ])

    return (
        <Suspense fallback={<div className="h-96 w-full animate-pulse bg-neutral-50 rounded-3xl" />}>
            <FinancialControlClient
                restaurantId={restaurant.id}
                initialDate={dateStr}
                initialDailySales={dailySales}
                initialExpenses={expenses}
                billingData={billingData}
            />
        </Suspense>
    )
}
