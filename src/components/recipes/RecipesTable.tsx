'use client'

import { RecipeWithCost, RecipeDetailItem, getRecipeDetails } from "@/app/actions/recipes"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { Eye, Edit2 } from "lucide-react"
import Link from "next/link"
import { DeleteRecipeAlert } from "./DeleteRecipeAlert"

interface Props {
    recipes: RecipeWithCost[]
}

export function RecipesTable({ recipes }: Props) {
    const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetailItem[] | null>(null)

    const loadDetails = async (id: string) => {
        try {
            const data = await getRecipeDetails(id)
            setSelectedRecipe(data)
        } catch (error) {
            console.error("Failed to load details", error)
        }
    }

    return (
        <div className="rounded-xl border shadow-sm bg-white overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead className="w-[30%]">Receta</TableHead>
                        <TableHead className="text-right">PVP</TableHead>
                        <TableHead className="text-right">Coste</TableHead>
                        <TableHead className="text-center">Coste MP %</TableHead>
                        <TableHead className="text-center w-[150px]">Margen Real</TableHead>
                        <TableHead className="text-right w-[140px]">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {recipes.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                No hay recetas aún. ¡Crea la primera!
                            </TableCell>
                        </TableRow>
                    )}
                    {recipes.map((recipe) => {
                        const margin = recipe.calculated_margin || 0
                        const target = recipe.target_margin_pct || 70
                        const isGood = margin >= target
                        const isCritical = margin < 20

                        // Food Cost % = Cost / Price
                        const foodCostPct = recipe.selling_price ? (recipe.current_cost / recipe.selling_price) * 100 : 0

                        return (
                            <TableRow key={recipe.id} className="hover:bg-slate-50/50 transition-colors group">
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs ring-1 ring-indigo-200">
                                            {recipe.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-900">{recipe.name}</div>
                                            {/* Description not available in schema yet */}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-mono font-medium">
                                    €{recipe.selling_price?.toFixed(2) || "0.00"}
                                </TableCell>
                                <TableCell className="text-right font-mono text-slate-600">
                                    €{recipe.current_cost.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline" className="font-mono text-xs">
                                        {foodCostPct > 0 ? `${foodCostPct.toFixed(1)}%` : '-'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex justify-between items-end">
                                            <span className={`text-xs font-bold ${isCritical ? 'text-red-600' : isGood ? 'text-green-600' : 'text-yellow-600'}`}>
                                                {margin.toFixed(1)}%
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">Obj: {target}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${isCritical ? 'bg-red-500' : isGood ? 'bg-green-500' : 'bg-yellow-500'}`}
                                                style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => recipe.id && loadDetails(recipe.id)}
                                                    disabled={!recipe.id}
                                                    className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-3xl">
                                                <DialogHeader>
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                                            {recipe.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <DialogTitle>{recipe.name}</DialogTitle>
                                                            <p className="text-sm text-muted-foreground">Desglose de costes e ingredientes</p>
                                                        </div>
                                                    </div>
                                                </DialogHeader>

                                                {selectedRecipe ? (
                                                    <div className="bg-slate-50 rounded-xl border overflow-hidden mt-4">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>Ingrediente</TableHead>
                                                                    <TableHead>Cantidad Bruta</TableHead>
                                                                    <TableHead className="text-right">Coste Unit.</TableHead>
                                                                    <TableHead className="text-right">Coste Total</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {selectedRecipe.map(item => (
                                                                    <TableRow key={item.id}>
                                                                        <TableCell className="font-medium">
                                                                            <div className="flex flex-col">
                                                                                <span>{item.ingredient_name}</span>
                                                                                {item.type === 'RECIPE' && (
                                                                                    <Badge variant="secondary" className="w-fit text-[10px] h-4">Sub-receta</Badge>
                                                                                )}
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {item.quantity_gross} <span className="text-muted-foreground text-xs">{item.unit}</span>
                                                                        </TableCell>
                                                                        <TableCell className="text-right font-mono text-xs">€{item.cost_per_unit.toFixed(2)}</TableCell>
                                                                        <TableCell className="text-right font-medium font-mono">
                                                                            €{item.total_cost.toFixed(3)}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                                <TableRow className="bg-slate-100 font-bold border-t-2 border-slate-200">
                                                                    <TableCell colSpan={3} className="text-right">COSTE TOTAL</TableCell>
                                                                    <TableCell className="text-right text-lg text-indigo-700">
                                                                        €{selectedRecipe.reduce((acc, i) => acc + i.total_cost, 0).toFixed(2)}
                                                                    </TableCell>
                                                                </TableRow>
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                ) : (
                                                    <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
                                                        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-4" />
                                                        Cargando escandallo...
                                                    </div>
                                                )}
                                            </DialogContent>
                                        </Dialog>

                                        <Link href={`/recipes/${recipe.id}/edit`}>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50">
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                        </Link>

                                        <DeleteRecipeAlert
                                            recipeId={recipe.id!}
                                            recipeName={recipe.name}
                                        />
                                    </div>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}
