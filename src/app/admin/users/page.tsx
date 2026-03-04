import { getAdminUsers } from "@/app/actions/admin-queries"
import { getAllRestaurants } from "@/app/actions/admin-queries"
import { UserManagement } from "@/components/admin/UserManagement"

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
    const [users, restaurants] = await Promise.all([
        getAdminUsers(),
        getAllRestaurants()
    ])

    const restaurantOptions = (restaurants || []).map(r => ({
        id: r.id,
        name: r.name
    }))

    return (
        <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Gestión de Usuarios</h1>
                <p className="text-sm text-neutral-400 mt-1">
                    Usuarios registrados, roles y restaurantes asignados.
                </p>
            </div>
            <UserManagement initialUsers={users} restaurants={restaurantOptions} />
        </div>
    )
}
