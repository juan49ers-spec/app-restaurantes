import { ShiftBoard } from "@/components/staff/ShiftBoard"
import { CalendarClock, Sparkles } from "lucide-react"
import { getCurrentRestaurant } from "@/app/actions/user"
import { redirect } from "next/navigation"

export default async function SchedulePage() {
    const restaurant = await getCurrentRestaurant()

    if (!restaurant) {
        redirect("/login")
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-medium">
                        <CalendarClock className="w-5 h-5" />
                        <span>Gestión de Turnos</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight italic uppercase tracking-tighter">Smart Scheduling</h1>
                    <p className="text-muted-foreground">
                        Planifica los turnos de tu equipo y visualiza el impacto en el labor cost en tiempo real.
                    </p>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-600 rounded-full text-xs font-medium border border-amber-500/20">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>IA Optimizer próximamente</span>
                </div>
            </header>

            <ShiftBoard restaurantId={restaurant.id} />
        </div>
    )
}
