import { requireRestaurant } from "@/lib/auth-helpers"
import { getInventorySessions, getActiveInventorySession } from "@/app/actions/inventory"
import { InventoryHistoryList } from "@/components/operational/inventory/InventoryHistoryList"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus, Play } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
    await requireRestaurant()

    const [sessions, activeSession] = await Promise.all([
        getInventorySessions(),
        getActiveInventorySession()
    ])

    return (
        <div className="container mx-auto py-8 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Control de Inventario</h1>
                    <p className="text-muted-foreground mt-1">
                        Toma de inventario físico y cálculo de consumos
                    </p>
                </div>

                <div className="flex gap-2">
                    {activeSession ? (
                        <Link href={`/operations/inventory/count/${activeSession.id}`}>
                            <Button className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
                                <Play className="h-4 w-4" />
                                Reanudar Recuento Pendiente
                            </Button>
                        </Link>
                    ) : (
                        <Link href={`/operations/inventory/new`}>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                Iniciar Recuento
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            <InventoryHistoryList sessions={sessions} />
        </div>
    )
}
