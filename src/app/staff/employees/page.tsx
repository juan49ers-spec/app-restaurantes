import { Suspense } from "react"
import { createClient } from "@/lib/supabaseServer"
import { getEmployees } from "@/app/actions/staff"
import { ClientEmployeesView } from "./ClientEmployeesView"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata = {
    title: "Equipo | ControlHub",
    description: "Gestión de personal y costes operativos",
}

function EmployeesLoading() {
    return (
        <div className="space-y-6 max-w-5xl mx-auto p-4 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-32 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 rounded-2xl" />
                ))}
            </div>
            <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
            </div>
        </div>
    )
}

async function EmployeesDataWrapper() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return <div>No autorizado</div>

    // En una app real usaríamos el restaurant_id del contexto del usuario
    // Por ahora usamos "1" o el ID que maneje la sesión actual
    const restaurant_id = user.user_metadata?.restaurant_id || "1"

    const { data: employees, error } = await getEmployees(restaurant_id)

    if (error) {
        return (
            <div className="p-8 text-center bg-rose-50 border border-rose-100 rounded-2xl text-rose-700">
                <p className="font-bold">Error al cargar el equipo</p>
                <p className="text-sm opacity-80">{error}</p>
            </div>
        )
    }

    return (
        <ClientEmployeesView
            initialEmployees={employees || []}
            restaurantId={restaurant_id}
        />
    )
}

export default function EmployeesPage() {
    return (
        <div className="min-h-screen">
            <Suspense fallback={<EmployeesLoading />}>
                <EmployeesDataWrapper />
            </Suspense>
        </div>
    )
}
