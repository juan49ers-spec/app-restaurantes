"use client"

import { useState, useEffect, useTransition } from "react"
import { ShoppingCart, Save, Loader2, ChefHat, CalendarDays } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

import { processRecipeSales, getRecipesForSales, getDailyRecipeSales, previewStockImpact } from "@/app/actions/stock-actions"
import { AlertTriangle, ArrowRight } from "lucide-react"

interface RecipeOption {
    id: string
    name: string
    selling_price: number | null
    current_cost: number
}

interface SaleEntry {
    recipeId: string
    recipeName: string
    qty: number
    unitPrice: number
}

export function DailyRecipeSalesForm() {
    const [sales, setSales] = useState<SaleEntry[]>([])
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
    const [loading, setLoading] = useState(true)
    const [isPending, startTransition] = useTransition()

    // Preview State
    const [showPreview, setShowPreview] = useState(false)
    const [previewData, setPreviewData] = useState<any[]>([])
    const [calculatingPreview, setCalculatingPreview] = useState(false)

    // Load recipes and existing sales for the date
    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true)
                const [recipesData, existingSalesData] = await Promise.all([
                    getRecipesForSales(),
                    getDailyRecipeSales(date)
                ])

                // Map existing sales into form state
                const existingMap = new Map<string | undefined, number>()
                for (const s of existingSalesData || []) {
                    const recipe = Array.isArray(s.recipe) ? s.recipe[0] : s.recipe
                    existingMap.set(recipe?.id, s.quantity_sold)
                }

                const entries: SaleEntry[] = recipesData.map((r: RecipeOption) => ({
                    recipeId: r.id,
                    recipeName: r.name,
                    qty: existingMap.get(r.id) || 0,
                    unitPrice: r.selling_price || 0
                }))

                setSales(entries)
            } catch {
                toast.error("Error cargando recetas")
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [date])

    const updateQty = (recipeId: string, qty: number) => {
        setSales(prev =>
            prev.map(s => s.recipeId === recipeId ? { ...s, qty: Math.max(0, qty) } : s)
        )
    }

    const handlePreview = async () => {
        const salesData = sales
            .filter(s => s.qty > 0)
            .map(s => ({ recipeId: s.recipeId, qty: s.qty }))

        if (salesData.length === 0) {
            toast.warning("No hay ventas que registrar")
            return
        }

        setCalculatingPreview(true)
        try {
            const impact = await previewStockImpact(salesData)
            setPreviewData(impact)
            setShowPreview(true)
        } catch {
            toast.error("Error calculando impacto en stock")
        } finally {
            setCalculatingPreview(false)
        }
    }

    const confirmSave = () => {
        const salesData = sales
            .filter(s => s.qty > 0)
            .map(s => ({ recipeId: s.recipeId, qty: s.qty }))

        startTransition(async () => {
            try {
                const result = await processRecipeSales(date, salesData)
                toast.success(`Stock actualizado. ${result.ingredientsAffected} ingredientes afectados.`)
                 setShowPreview(false)
            } catch {
                toast.error("Error procesando ventas")
            }
        })
    }

    // KPIs
    const totalUnits = sales.reduce((acc, s) => acc + s.qty, 0)
    const totalRevenue = sales.reduce((acc, s) => acc + (s.qty * s.unitPrice), 0)
    const recipesWithSales = sales.filter(s => s.qty > 0).length
    const fmt = (v: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)
    const fmtDec = (v: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(v)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Label htmlFor="sale-date" className="text-sm font-medium flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4" /> Fecha:
                    </Label>
                    <Input
                        id="sale-date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-44"
                    />
                </div>
            </div>

            {/* Live KPIs */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="bg-white border-neutral-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Unidades Vendidas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-neutral-900 tabular-nums">{totalUnits}</div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-neutral-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Facturación Est.</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600 tabular-nums">{fmt(totalRevenue)}</div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-neutral-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-violet-500" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Recetas Activas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-neutral-900 tabular-nums">{recipesWithSales}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Sales Form Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ChefHat className="w-5 h-5 text-indigo-500" /> Conteo de Ventas por Receta
                    </CardTitle>
                    <CardDescription>
                        Introduce cuántas unidades de cada receta se vendieron hoy. Al guardar, verás una previsualización del descuento de stock.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Receta</TableHead>
                                <TableHead className="text-right">PVP</TableHead>
                                <TableHead className="text-center w-40">Uds. Vendidas</TableHead>
                                <TableHead className="text-right">Subtotal</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-12 text-neutral-400">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                                        Cargando recetas...
                                    </TableCell>
                                </TableRow>
                            ) : sales.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-12 text-neutral-400">
                                        <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        No hay recetas registradas. Crea recetas primero en Escandallos.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sales.map((entry) => (
                                    <TableRow key={entry.recipeId} className={entry.qty > 0 ? 'bg-indigo-50/30' : ''}>
                                        <TableCell className="font-medium">{entry.recipeName}</TableCell>
                                        <TableCell className="text-right font-mono tabular-nums text-sm text-neutral-500">
                                            {fmt(entry.unitPrice)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => updateQty(entry.recipeId, entry.qty - 1)}
                                                    disabled={entry.qty <= 0}
                                                >
                                                    −
                                                </Button>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    value={entry.qty}
                                                    onChange={(e) => updateQty(entry.recipeId, Number(e.target.value) || 0)}
                                                    className="w-16 text-center h-8 font-mono tabular-nums"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => updateQty(entry.recipeId, entry.qty + 1)}
                                                >
                                                    +
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono tabular-nums text-sm">
                                            {entry.qty > 0 ? (
                                                <Badge variant="outline" className="font-mono">
                                                    {fmt(entry.qty * entry.unitPrice)}
                                                </Badge>
                                            ) : (
                                                <span className="text-neutral-300">—</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-end">
                <Button
                    size="lg"
                    onClick={handlePreview}
                    disabled={isPending || calculatingPreview || totalUnits === 0}
                    className="min-w-[240px] shadow-lg hover:shadow-xl transition-all"
                >
                    {calculatingPreview ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calculando Escandallo...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" /> Guardar Ventas
                        </>
                    )}
                </Button>
            </div>

            {/* Confirmation Live Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-neutral-100 flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                    Confirmar Descuento de Stock
                                </h3>
                                <p className="text-sm text-neutral-500 mt-1">
                                    Se descontarán los siguientes ingredientes del inventario basados en las recetas vendidas.
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-0">
                            <Table>
                                <TableHeader className="bg-neutral-50">
                                    <TableRow>
                                        <TableHead>Ingrediente</TableHead>
                                        <TableHead className="text-right">Stock Actual</TableHead>
                                        <TableHead className="text-right font-bold text-red-600">A Descontar</TableHead>
                                        <TableHead className="text-right">Stock Final</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {previewData.map((item) => (
                                        <TableRow key={item.ingredientId}>
                                            <TableCell className="font-medium text-sm">
                                                {item.name}
                                                <span className="text-xs text-neutral-400 ml-1">({item.unit})</span>
                                            </TableCell>
                                            <TableCell className="text-right text-neutral-500 font-mono">
                                                {fmtDec(item.currentStock)}
                                            </TableCell>
                                            <TableCell className="text-right text-red-600 font-bold font-mono bg-red-50/50">
                                                - {fmtDec(item.deduction)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                <span className={item.estimatedStock < 0 ? "text-red-600 font-bold" : "text-neutral-700"}>
                                                    {fmtDec(item.estimatedStock)}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="p-6 border-t border-neutral-100 bg-neutral-50 flex justify-between items-center gap-4">
                            <Button variant="ghost" onClick={() => setShowPreview(false)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={confirmSave}
                                disabled={isPending}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[160px]"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...
                                    </>
                                ) : (
                                    <>
                                        Confirmar y Descontar <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
