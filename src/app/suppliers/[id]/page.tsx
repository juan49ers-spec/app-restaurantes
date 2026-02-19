import { getSupplier } from "@/app/actions/suppliers"
import { getSupplierItems } from "@/app/actions/supplierItems"
import { getIngredients } from "@/app/actions/ingredients"
import { SupplierItemsTable } from "@/components/suppliers/SupplierItemsTable"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Link from "next/link"
import { ChevronLeft, Building2, Phone, Mail } from "lucide-react"

export default async function SupplierDetailPage({ params }: { params: { id: string } }) {
    // 1. Fetch Parallel
    const supplierPromise = getSupplier(params.id)
    const itemsPromise = getSupplierItems(params.id)
    const masterIngredientsPromise = getIngredients() // For dropdown

    const [supplier, items, masterIngredients] = await Promise.all([
        supplierPromise,
        itemsPromise,
        masterIngredientsPromise
    ])

    return (
        <div className="container mx-auto py-10 space-y-6">
            <div>
                <Link href="/suppliers" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-2">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Volver a Proveedores
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">{supplier.name}</h1>
                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    {supplier.tax_id && <span className="flex items-center"><Building2 className="w-4 h-4 mr-1" /> {supplier.tax_id}</span>}
                    {supplier.contact_email && <span className="flex items-center"><Mail className="w-4 h-4 mr-1" /> {supplier.contact_email}</span>}
                    {supplier.contact_phone && <span className="flex items-center"><Phone className="w-4 h-4 mr-1" /> {supplier.contact_phone}</span>}
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Productos y Memorización</CardTitle>
                    <CardDescription>
                        Define qué productos compras a este proveedor y mapéalos a tus Ingredientes Maestros.
                        Esto permitirá que las facturas actualicen tus costos automáticamente.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SupplierItemsTable
                        supplierId={supplier.id!}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        initialItems={items as any}
                        masterIngredients={masterIngredients}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
