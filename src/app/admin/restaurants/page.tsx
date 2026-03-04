import { getAllRestaurants } from "@/app/actions/admin-queries"
import { RestaurantList } from "@/components/admin/RestaurantList"

export const dynamic = 'force-dynamic'

export default async function RestaurantsPage() {
    const restaurants = await getAllRestaurants() || []

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
