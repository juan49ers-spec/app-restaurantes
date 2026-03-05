import { MasterIngredient } from "@/types/schema"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DeleteIngredientAlert } from "./DeleteIngredientAlert"
import { IngredientDialog } from "./IngredientDialog"
import { AllergenBadges } from "./AllergenSelector"

interface Props {
    ingredients: MasterIngredient[]
    onDelete?: (id: string) => void
}

export function IngredientsTable({ ingredients, onDelete }: Props) {

    const getYieldBadgeVariant = (wastePct: number) => {
        const yieldPct = (1 - wastePct) * 100
        if (yieldPct >= 95) return "default" // Greenish in strict themes, or customize
        if (yieldPct >= 80) return "secondary" // Yellow/Orange
        return "destructive" // Red
    }

    const getYieldLabel = (wastePct: number) => {
        const yieldPct = (1 - wastePct) * 100
        return `${yieldPct.toFixed(1)}%`
    }

    if (ingredients.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-muted/10 border-dashed">
                <p className="text-muted-foreground text-center">
                    No hay ingredientes todavía.
                    <br />
                    ¡Crea el primero arriba!
                </p>
            </div>
        )
    }

    return (
        <div className="rounded-lg border border-border overflow-hidden shadow-sm animate-fade-in-up bg-white">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="font-semibold w-[25%]">Ingrediente</TableHead>
                            <TableHead className="font-semibold w-[10%]">Unidad</TableHead>
                            <TableHead className="font-semibold w-[15%]">Rendimiento</TableHead>
                            <TableHead className="font-semibold w-[20%]">Alérgenos</TableHead>
                            <TableHead className="w-[100px]">Merma</TableHead>
                            <TableHead className="w-[100px]">Precio (€)</TableHead>
                            <TableHead className="text-right w-[100px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ingredients.map((ing, index) => {
                            const delay = (index % 10) * 50 // Staggered animation

                            return (
                                <TableRow
                                    key={ing.id}
                                    className="group hover:bg-muted/50 transition-colors"
                                    style={{ animationDelay: `${delay}ms` }}
                                >
                                    <TableCell className="font-medium text-foreground">
                                        <div className="flex flex-col">
                                            <span>{ing.name}</span>
                                            {ing.category && (
                                                <span className="text-xs text-muted-foreground font-normal">{ing.category}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-mono text-xs uppercase">
                                            {ing.base_unit}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getYieldBadgeVariant(ing.standard_waste_pct)}>
                                            {getYieldLabel(ing.standard_waste_pct)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <AllergenBadges allergens={ing.allergens || []} compact />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-16 rounded-full bg-secondary overflow-hidden">
                                                <div
                                                    className={`h-full ${(ing.standard_waste_pct || 0) > 0.15 ? 'bg-destructive' : 'bg-green-500'
                                                        }`}
                                                    style={{ width: `${(ing.standard_waste_pct || 0) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-muted-foreground w-8 text-right">
                                                {((ing.standard_waste_pct || 0) * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-mono text-sm font-medium">
                                            {ing.current_avg_price === 0 ? (
                                                <span className="text-muted-foreground opacity-50">-</span>
                                            ) : (
                                                `€${ing.current_avg_price.toFixed(3)}`
                                            )}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <IngredientDialog
                                                initialData={ing}
                                                trigger={
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 px-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    >
                                                        Editar
                                                    </Button>
                                                }
                                            />

                                            <DeleteIngredientAlert
                                                ingredientId={ing.id!}
                                                ingredientName={ing.name}
                                                onDelete={() => onDelete?.(ing.id!)}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
