import { Suspense } from "react"
import { getIngredients } from "@/app/actions/ingredients"
import { requireRestaurant } from "@/lib/auth-helpers"
import { IngredientsClientPage } from "@/components/ingredients/IngredientsClientPage"
import { Skeleton } from "@/components/ui/skeleton"

export const dynamic = 'force-dynamic'

function IngredientsLoading() {
    return (
        <div className="container mx-auto py-10 space-y-8">
            <div>
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96 mt-2" />
            </div>
            <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
            </div>
        </div>
    )
}

async function IngredientsData() {
    await requireRestaurant()
    const ingredients = await getIngredients()
    return (
        <div className="container mx-auto py-10 space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Ingredientes Maestros</h1>
                <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
                    Gestiona los precios base y mermas de tus productos. Estos datos alimentan automáticamente todos los costes de tus recetas.
                </p>
            </div>
            <IngredientsClientPage initialIngredients={ingredients || []} />
        </div>
    )
}

export default function IngredientsPage() {
    return (
        <Suspense fallback={<IngredientsLoading />}>
            <IngredientsData />
        </Suspense>
    )
}
