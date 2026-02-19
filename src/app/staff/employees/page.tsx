import { StaffDirectory } from "@/components/staff/StaffDirectory"
import { Users, Info } from "lucide-react"
import { getCurrentRestaurant } from "@/app/actions/user"
import { redirect } from "next/navigation"

export default async function EmployeesPage() {
    const restaurant = await getCurrentRestaurant()

    if (!restaurant) {
        redirect("/login")
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-medium">
                        <Users className="w-5 h-5" />
                        <span>Estructura de Equipo</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight italic uppercase tracking-tighter">Directorio de Personal</h1>
                    <p className="text-muted-foreground">
                        Gestiona los perfiles de tu equipo, roles e impacto en costos operativos.
                    </p>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-600 rounded-full text-xs font-medium border border-blue-500/20">
                    <Info className="w-3.5 h-3.5" />
                    <span>Solo administradores pueden editar salarios</span>
                </div>
            </header>

            <StaffDirectory restaurantId={restaurant.id} />
        </div>
    )
}
