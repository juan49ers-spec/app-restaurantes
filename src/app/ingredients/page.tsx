import { getIngredients } from "@/app/actions/ingredients"
import { requireRestaurant } from "@/lib/auth-helpers"
import { IngredientsClientPage } from "@/components/ingredients/IngredientsClientPage"

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic'

export default async function IngredientsPage() {
    // 1. Auth Check & Multi-tenancy
    await requireRestaurant()

    // 2. Data Fetching
    const ingredients = await getIngredients()

    // 3. Render
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
