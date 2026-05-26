import { AdminRestaurantRow, getAllRestaurants } from "@/app/actions/admin-queries"
import { RestaurantList } from "@/components/admin/RestaurantList"

export const dynamic = 'force-dynamic'

export default async function RestaurantsPage() {
    let restaurants: AdminRestaurantRow[] = []
    let loadError: unknown = null

    try {
        restaurants = await getAllRestaurants() || []
    } catch (error) {
        loadError = error
        console.error("Critical error in RestaurantsPage:", error)
    }

    if (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Error desconocido'
        const stack = loadError instanceof Error ? loadError.stack : 'No stack trace available'

        return (
            <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
                <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl overflow-auto">
                    <h2 className="text-red-500 font-bold text-lg mb-4">Error Crítico al cargar la página</h2>
                    <p className="text-red-400 text-sm mb-4">Por favor, reporta este error:</p>
                    <pre className="text-red-400/80 text-xs font-mono whitespace-pre-wrap bg-black/20 p-4 rounded-lg">
                        {message}
                        {'\n\n'}
                        {stack}
                    </pre>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Gestión de Restaurantes</h1>
                <p className="text-sm text-neutral-400 mt-1">Controla suscripciones y módulos activos para cada restaurante.</p>
            </div>
            <RestaurantList initialRestaurants={restaurants} />
        </div>
    )
}
