import { getIngredients } from "@/app/actions/ingredients"
import { getRecipes, getRecipeForEdit } from "@/app/actions/recipes"
import { RecipeEditorClient } from "./client"

// Generate metadata or simple wrapper
export default async function RecipeEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    // Parallel Fetching
    const ingredientsPromise = getIngredients()

    // We also fetch recipes to show them in pantry eventually (Phase 2 Pro)
    const subRecipesPromise = getRecipes()

    // Initial Data for Edit Mode
    const initialRecipePromise = id !== 'new' ? getRecipeForEdit(id) : Promise.resolve(undefined)

    const [masterIngredients, subRecipes, initialRecipe] = await Promise.all([
        ingredientsPromise,
        subRecipesPromise,
        initialRecipePromise
    ])

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
            <RecipeEditorClient
                initialIngredients={masterIngredients}
                initialRecipes={subRecipes}
                recipeId={id}
                initialData={initialRecipe}
            />
        </div>
    )
}
