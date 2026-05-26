import { getCurrentRestaurant } from "@/app/actions/user"
import { redirect } from "next/navigation"
import { PolicyBoard } from "@/components/staff/PolicyBoard"

export default async function PoliciesPage() {
    const restaurant = await getCurrentRestaurant()

    if (!restaurant) {
        redirect("/login")
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <PolicyBoard restaurantId={restaurant.id} />
        </div>
    )
}
