import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MasterIngredient } from "@/types/schema"
import { Package, Percent, DollarSign, TrendingUp } from "lucide-react"

interface Props {
    ingredients: MasterIngredient[]
}

export function IngredientSummaryCards({ ingredients }: Props) {
    const totalIngredients = ingredients.length

    // Avg Yield
    const avgWaste = ingredients.reduce((acc, curr) => acc + (curr.standard_waste_pct || 0), 0) / (totalIngredients || 1)
    const avgYield = ((1 - avgWaste) * 100).toFixed(1)

    // Most Expensive
    const mostExpensive = ingredients.reduce((prev, current) => {
        return (prev.current_avg_price || 0) > (current.current_avg_price || 0) ? prev : current
    }, {} as MasterIngredient)

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Total Ingredientes
                    </CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalIngredients}</div>
                    <p className="text-xs text-muted-foreground">
                        Productos registrados
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Rendimiento Promedio
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{avgYield}%</div>
                    <p className="text-xs text-muted-foreground">
                        Eficiencia global
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Mayor Coste Base
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {mostExpensive.current_avg_price?.toFixed(2) || "0.00"} €
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                        {mostExpensive.name || "-"}
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
