import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package, ShoppingCart } from "lucide-react"

import { StockDashboard } from "@/components/stock/StockDashboard"
import { DailyRecipeSalesForm } from "@/components/stock/DailyRecipeSalesForm"

export const dynamic = 'force-dynamic'

export default function StockPage() {
    return (
        <div className="container mx-auto py-8 space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold text-neutral-900">Control de Stock</h1>
                <p className="text-sm text-neutral-500 mt-1">
                    Gestiona el inventario de ingredientes y registra las ventas diarias para descontar automáticamente.
                </p>
            </div>

            <Tabs defaultValue="inventory" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="inventory" className="gap-1.5">
                        <Package className="w-4 h-4" /> Inventario
                    </TabsTrigger>
                    <TabsTrigger value="sales" className="gap-1.5">
                        <ShoppingCart className="w-4 h-4" /> Ventas del Día
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="inventory">
                    <StockDashboard />
                </TabsContent>

                <TabsContent value="sales">
                    <DailyRecipeSalesForm />
                </TabsContent>
            </Tabs>
        </div>
    )
}
