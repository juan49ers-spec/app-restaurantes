import { requireRestaurant } from "@/lib/auth-helpers"
import { getInventoryItemsForCount } from "@/app/actions/inventory"
import { InventoryCountingForm } from "@/components/operational/inventory/InventoryCountingForm"
import { notFound } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function InventoryCountPage({ params }: { params: { sessionId: string } }) {
    await requireRestaurant() // Security check

    const sessionId = params.sessionId
    if (!sessionId) {
        notFound()
    }

    const itemsForCount = await getInventoryItemsForCount(sessionId)

    return (
        <div className="container mx-auto py-4 md:py-8 max-w-4xl">
            <InventoryCountingForm sessionId={sessionId} initialItems={itemsForCount} />
        </div>
    )
}
