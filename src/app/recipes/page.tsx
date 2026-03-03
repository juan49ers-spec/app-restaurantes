import { Suspense } from "react"
import { getRecipes } from "@/app/actions/recipes"
import { RecipesClientPage } from "@/components/recipes/RecipesClientPage"
import { Skeleton } from "@/components/ui/skeleton"

function RecipesLoading() {
    return (
        <div className="container mx-auto py-10 space-y-6">
            <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-10 w-36 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-40 rounded-2xl" />
                ))}
            </div>
        </div>
    )
}

async function RecipesData() {
    const recipes = await getRecipes()
    return <RecipesClientPage initialRecipes={recipes} />
}

export default function RecipesPage() {
    return (
        <div className="container mx-auto py-10">
            <Suspense fallback={<RecipesLoading />}>
                <RecipesData />
            </Suspense>
        </div>
    )
}
