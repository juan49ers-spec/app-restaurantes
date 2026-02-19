import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RecipeWithCost } from "@/app/actions/recipes"
import { Utensils, TrendingUp, AlertTriangle } from "lucide-react"

interface Props {
    recipes: RecipeWithCost[]
}

export function RecipeSummaryCards({ recipes }: Props) {
    const totalRecipes = recipes.length

    // Avg Margin
    // Filter out recipes with 0 cost or price to avoid skewing data with drafts
    const validRecipes = recipes.filter(r => r.selling_price && r.selling_price > 0)
    const avgMargin = validRecipes.length > 0
        ? validRecipes.reduce((acc, curr) => acc + (curr.calculated_margin || 0), 0) / validRecipes.length
        : 0

    // Lowest Margin (Risky)
    const riskyRecipe = validRecipes.reduce((prev, current) => {
        return (prev.calculated_margin || 100) < (current.calculated_margin || 100) ? prev : current
    }, {} as RecipeWithCost)

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Total Recetas
                    </CardTitle>
                    <Utensils className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalRecipes}</div>
                    <p className="text-xs text-muted-foreground">
                        Platos activos
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Margen Promedio
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${avgMargin < 70 ? "text-yellow-600" : "text-green-600"}`}>
                        {avgMargin.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Objetivo: &gt;70%
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Menor Margen
                    </CardTitle>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-destructive">
                        {riskyRecipe.calculated_margin?.toFixed(1) || "-"}%
                    </div>
                    <p className="text-xs text-muted-foreground truncate" title={riskyRecipe.name}>
                        {riskyRecipe.name || "N/A"}
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
