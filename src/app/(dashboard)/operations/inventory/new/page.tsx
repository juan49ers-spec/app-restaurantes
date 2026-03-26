import { startInventorySession } from "@/app/actions/inventory"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function NewInventorySessionPage() {
    // Cuando el usuario entra aquí, creamos/buscamos sesión y redirigimos a count/[id]
    const session = await startInventorySession()
    redirect(`/operations/inventory/count/${session.id}`)
}
