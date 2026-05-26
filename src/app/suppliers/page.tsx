import { Suspense } from "react"
import { getSuppliers } from "@/app/actions/suppliers"
import { SupplierTable } from "@/components/suppliers/SupplierTable"
import { Skeleton } from "@/components/ui/skeleton"

function SuppliersLoading() {
    return (
        <div className="container mx-auto py-10 space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-80" />
            <div className="space-y-3 mt-8">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
            </div>
        </div>
    )
}

async function SuppliersData() {
    const suppliers = await getSuppliers()
    return (
        <>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Proveedores</h1>
            <p className="text-muted-foreground mb-8">
                Gestiona tu base de datos de proveedores y sus condiciones.
            </p>
            <SupplierTable initialSuppliers={suppliers} />
        </>
    )
}

export default function SuppliersPage() {
    return (
        <div className="container mx-auto py-10">
            <Suspense fallback={<SuppliersLoading />}>
                <SuppliersData />
            </Suspense>
        </div>
    )
}
