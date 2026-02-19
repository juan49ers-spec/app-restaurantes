import { requireRestaurant } from "@/lib/auth-helpers"
import { OperationalDashboardClient } from "@/components/operational/OperationalDashboardClient"
import { getOperationalAlerts, getOperationalKPIs, getPendingTasks } from "@/app/actions/operational"

export const dynamic = 'force-dynamic'

export default async function OperationalDashboardPage() {
    const restaurant = await requireRestaurant()

    // Fetch all operational data
    const [alerts, kpis, tasks] = await Promise.all([
        getOperationalAlerts(),
        getOperationalKPIs(),
        getPendingTasks()
    ])

    return (
        <div className="container mx-auto py-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard Operativo</h1>
                <p className="text-muted-foreground mt-1">
                    Control y gestión de operaciones del restaurante
                </p>
            </div>

            <OperationalDashboardClient
                alerts={alerts}
                kpis={kpis}
                tasks={tasks}
                restaurantName={restaurant.name}
            />
        </div>
    )
}
