
import { getAllRestaurants } from "@/app/actions/admin"
import { RestaurantList } from "@/components/admin/RestaurantList"
import { redirect } from "next/navigation"

export default async function AdminPage() {
    let restaurants = []

    try {
        restaurants = await getAllRestaurants() || []
    } catch (_error) {
        // If unauthorized or other error, redirect to home or login
        redirect('/')
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Client Management</h1>
                <p className="text-slate-500">Manage subscriptions and module access for all restaurants.</p>
            </div>

            <RestaurantList initialRestaurants={restaurants} />
        </div>
    )
}
