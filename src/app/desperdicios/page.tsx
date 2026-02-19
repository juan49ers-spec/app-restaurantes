import { WasteLogger } from "@/components/waste/WasteLogger"

export const dynamic = 'force-dynamic'

export default function DesperdiciosPage() {
    return (
        <div className="container mx-auto py-8 space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold text-neutral-900">Desperdicios</h1>
                <p className="text-sm text-neutral-500 mt-1">
                    Registra las mermas diarias de ingredientes. Se descontarán automáticamente del stock.
                </p>
            </div>

            <WasteLogger />
        </div>
    )
}
