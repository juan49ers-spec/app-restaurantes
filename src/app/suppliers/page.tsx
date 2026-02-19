import { getSuppliers } from "@/app/actions/suppliers"
import { SupplierTable } from "@/components/suppliers/SupplierTable"

export default async function SuppliersPage() {
    // Phase 2 Auth Check: Handled by getSuppliers internal check or middleware
    const suppliers = await getSuppliers()

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Proveedores</h1>
            <p className="text-muted-foreground mb-8">
                Gestiona tu base de datos de proveedores y sus condiciones.
            </p>

            <SupplierTable initialSuppliers={suppliers} />
        </div>
    )
}
