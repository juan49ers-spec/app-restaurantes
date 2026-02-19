import { getRecipes } from "@/app/actions/recipes"
import { RecipesClientPage } from "@/components/recipes/RecipesClientPage"

export default async function RecipesPage() {
    const recipes = await getRecipes()

    return (
        <div className="container mx-auto py-10">
            <RecipesClientPage initialRecipes={recipes} />
        </div>
    )
}
