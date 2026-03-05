"use client"

import { useState, useEffect, useTransition } from "react"
import { Package, AlertTriangle, TrendingDown, Search, Plus, RefreshCw, Edit2, Check, X } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { getInventoryStock, upsertStock, initializeAllStock } from "@/app/actions/stock-actions"
import { ManualStockEntryDialog } from "./ManualStockEntryDialog"


interface InventoryItem {
    id: string
    current_qty: number
    min_qty: number
    last_updated: string
    ingredient: {
        id: string
        name: string
        base_unit: string
        category: string | null
        current_avg_price: number
    }
}

export function StockDashboard() {
    const [inventory, setInventory] = useState<InventoryItem[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editQty, setEditQty] = useState("")
    const [editMin, setEditMin] = useState("")
    const [isPending, startTransition] = useTransition()

    const loadInventory = async () => {
        try {
            setLoading(true)
            const data = await getInventoryStock()
            setInventory(data as unknown as InventoryItem[])
        } catch (error) {
            toast.error("Error cargando inventario")
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadInventory()
    }, [])

    const handleInitialize = () => {
        startTransition(async () => {
            try {
                const result = await initializeAllStock()
                toast.success(`${result.initialized} ingredientes inicializados`)
                await loadInventory()
            } catch {
                toast.error("Error inicializando stock")
            }
        })
    }

    const handleSaveEdit = (ingredientId: string) => {
        startTransition(async () => {
            try {
                await upsertStock(ingredientId, Number(editQty) || 0, Number(editMin) || 0)
                toast.success("Stock actualizado")
                setEditingId(null)
                await loadInventory()
            } catch {
                toast.error("Error guardando stock")
            }
        })
    }

    const startEdit = (item: InventoryItem) => {
        setEditingId(item.ingredient.id)
        setEditQty(String(item.current_qty))
        setEditMin(String(item.min_qty))
    }

    // Filters
    const filtered = inventory.filter(item =>
        item.ingredient.name.toLowerCase().includes(search.toLowerCase())
    )

    // KPIs
    const totalItems = inventory.length
    const belowMinimum = inventory.filter(i => i.current_qty < i.min_qty && i.min_qty > 0).length
    const totalValue = inventory.reduce((acc, i) =>
        acc + (i.current_qty * (i.ingredient.current_avg_price || 0)), 0
    )
    const outOfStock = inventory.filter(i => i.current_qty === 0).length

    const fmt = (v: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white border-neutral-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Total Ingredientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-neutral-900 tabular-nums">{totalItems}</div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-neutral-200 shadow-sm relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${belowMinimum > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Bajo Mínimo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold tabular-nums ${belowMinimum > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {belowMinimum}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-neutral-200 shadow-sm relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${outOfStock > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Sin Stock</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold tabular-nums ${outOfStock > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {outOfStock}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-neutral-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-violet-500" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Valor Inventario</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-neutral-900 tabular-nums">{fmt(totalValue)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input
                        placeholder="Buscar ingrediente..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={loadInventory} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
                    </Button>
                    <ManualStockEntryDialog onSuccess={loadInventory} />
                    <Button size="sm" onClick={handleInitialize} disabled={isPending} variant="secondary">
                        <Plus className="w-4 h-4 mr-1.5" /> Inicializar Stock
                    </Button>
                </div>
            </div>

            {/* Inventory Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ingrediente</TableHead>
                                    <TableHead>Categoría</TableHead>
                                    <TableHead className="text-right">Stock Actual</TableHead>
                                    <TableHead className="text-right">Mínimo</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                    <TableHead className="text-center">Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12 text-neutral-400">
                                            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                                            Cargando inventario...
                                        </TableCell>
                                    </TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12 text-neutral-400">
                                            <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                            {inventory.length === 0
                                                ? 'No hay stock registrado. Pulsa "Inicializar Stock" para comenzar.'
                                                : 'No se encontraron ingredientes con ese nombre.'
                                            }
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((item) => {
                                        const isEditing = editingId === item.ingredient.id
                                        const isBelowMin = item.min_qty > 0 && item.current_qty < item.min_qty
                                        const isZero = item.current_qty === 0
                                        const value = item.current_qty * (item.ingredient.current_avg_price || 0)

                                        return (
                                            <TableRow key={item.id} className={isZero ? 'bg-rose-50/30' : isBelowMin ? 'bg-amber-50/30' : ''}>
                                                <TableCell className="font-medium">{item.ingredient.name}</TableCell>
                                                <TableCell>
                                                    {item.ingredient.category ? (
                                                        <Badge variant="outline" className="text-xs">{item.ingredient.category}</Badge>
                                                    ) : (
                                                        <span className="text-neutral-300 text-xs">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {isEditing ? (
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={editQty}
                                                            onChange={(e) => setEditQty(e.target.value)}
                                                            className="w-24 text-right ml-auto h-8"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <span className="font-mono tabular-nums">
                                                            {item.current_qty.toFixed(2)} {item.ingredient.base_unit}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {isEditing ? (
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={editMin}
                                                            onChange={(e) => setEditMin(e.target.value)}
                                                            className="w-24 text-right ml-auto h-8"
                                                        />
                                                    ) : (
                                                        <span className="font-mono tabular-nums text-neutral-400">
                                                            {item.min_qty > 0 ? `${item.min_qty.toFixed(2)} ${item.ingredient.base_unit}` : '—'}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-mono tabular-nums text-sm">
                                                    {fmt(value)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {isZero ? (
                                                        <Badge variant="destructive" className="text-[10px]">
                                                            <AlertTriangle className="w-3 h-3 mr-1" /> Agotado
                                                        </Badge>
                                                    ) : isBelowMin ? (
                                                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px]">
                                                            <TrendingDown className="w-3 h-3 mr-1" /> Bajo
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">
                                                            OK
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {isEditing ? (
                                                        <div className="flex gap-1 justify-end">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 w-7 p-0 text-emerald-600"
                                                                onClick={() => handleSaveEdit(item.ingredient.id)}
                                                                disabled={isPending}
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 w-7 p-0 text-neutral-400"
                                                                onClick={() => setEditingId(null)}
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 w-7 p-0"
                                                            onClick={() => startEdit(item)}
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
