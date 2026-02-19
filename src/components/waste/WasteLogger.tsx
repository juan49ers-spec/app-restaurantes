"use client"

import { useState, useEffect, useTransition } from "react"
import { Trash2, Plus, CalendarDays, Loader2, Package } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"

import { getWasteLogs, addWasteEntry, deleteWasteEntry, getIngredientsForWaste } from "@/app/actions/waste-actions"

interface IngredientOption {
    id: string
    name: string
    base_unit: string
    category: string | null
    current_avg_price: number
}

interface WasteEntry {
    id: string
    date: string
    quantity: number
    reason: string
    notes: string | null
    ingredient: {
        id: string
        name: string
        base_unit: string
        current_avg_price: number
    }
}

const WASTE_REASONS: Record<string, string> = {
    CADUCADO: "Caducado",
    "DAÑADO": "Dañado / Mal estado",
    SOBRANTE: "Sobrante del día",
    PREPARACION: "Merma de preparación",
    OTRO: "Otro"
}

const REASON_COLORS: Record<string, string> = {
    CADUCADO: "bg-rose-100 text-rose-700",
    "DAÑADO": "bg-orange-100 text-orange-700",
    SOBRANTE: "bg-amber-100 text-amber-700",
    PREPARACION: "bg-blue-100 text-blue-700",
    OTRO: "bg-neutral-100 text-neutral-700"
}

export function WasteLogger() {
    const [ingredients, setIngredients] = useState<IngredientOption[]>([])
    const [logs, setLogs] = useState<WasteEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [isPending, startTransition] = useTransition()

    // Form state
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
    const [selectedIngredient, setSelectedIngredient] = useState("")
    const [quantity, setQuantity] = useState("")
    const [reason, setReason] = useState("OTRO")
    const [notes, setNotes] = useState("")

    const loadData = async () => {
        try {
            setLoading(true)
            const [ingredientsData, logsData] = await Promise.all([
                getIngredientsForWaste(),
                getWasteLogs()
            ])
            setIngredients(ingredientsData)
            setLogs(logsData as unknown as WasteEntry[])
        } catch (error) {
            toast.error("Error cargando datos")
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleAdd = () => {
        if (!selectedIngredient || !quantity || Number(quantity) <= 0) {
            toast.warning("Selecciona un ingrediente y una cantidad válida")
            return
        }

        startTransition(async () => {
            try {
                await addWasteEntry({
                    ingredientId: selectedIngredient,
                    quantity: Number(quantity),
                    reason,
                    date,
                    notes: notes || undefined
                })
                toast.success("Desperdicio registrado y stock actualizado")

                // Reset form
                setSelectedIngredient("")
                setQuantity("")
                setReason("OTRO")
                setNotes("")

                loadData()
            } catch (error) {
                toast.error("Error registrando desperdicio")
                console.error(error)
            }
        })
    }

    const handleDelete = (id: string) => {
        if (!confirm("¿Eliminar este registro? El stock se restaurará.")) return

        startTransition(async () => {
            try {
                await deleteWasteEntry(id)
                toast.success("Registro eliminado y stock restaurado")
                loadData()
            } catch {
                toast.error("Error eliminando registro")
            }
        })
    }

    // KPIs
    const totalEntries = logs.length
    const totalCostLost = logs.reduce((acc, l) => {
        const price = l.ingredient?.current_avg_price || 0
        return acc + (l.quantity * price)
    }, 0)
    const todayLogs = logs.filter(l => l.date === new Date().toISOString().split('T')[0])
    const todayCost = todayLogs.reduce((acc, l) => {
        const price = l.ingredient?.current_avg_price || 0
        return acc + (l.quantity * price)
    }, 0)

    const fmt = (v: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)

    const selectedUnit = ingredients.find(i => i.id === selectedIngredient)?.base_unit || ''

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="bg-white border-neutral-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Coste Total Mermas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-600 tabular-nums">{fmt(totalCostLost)}</div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-neutral-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Mermas Hoy</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600 tabular-nums">{fmt(todayCost)}</div>
                        <p className="text-[10px] text-neutral-400 mt-0.5">{todayLogs.length} registros</p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-neutral-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-violet-500" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Total Registros</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-neutral-900 tabular-nums">{totalEntries}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Add Waste Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Plus className="w-5 h-5 text-rose-500" /> Registrar Desperdicio
                    </CardTitle>
                    <CardDescription>
                        Selecciona el ingrediente y la cantidad desperdiciada. Se descontará automáticamente del stock.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                        <div className="space-y-2 lg:col-span-1">
                            <Label className="flex items-center gap-1.5">
                                <CalendarDays className="w-3.5 h-3.5" /> Fecha
                            </Label>
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2 lg:col-span-1">
                            <Label>Ingrediente</Label>
                            <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {ingredients.map(ing => (
                                        <SelectItem key={ing.id} value={ing.id}>
                                            {ing.name} ({ing.base_unit})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Cantidad {selectedUnit && `(${selectedUnit})`}</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="0.00"
                                className="font-mono"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Motivo</Label>
                            <Select value={reason} onValueChange={setReason}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(WASTE_REASONS).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button onClick={handleAdd} disabled={isPending} className="h-10">
                            {isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 mr-1.5" /> Añadir
                                </>
                            )}
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <Label>Notas (opcional)</Label>
                        <Input
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Lote 2024-B, encontrado en la cámara..."
                        />
                    </div>
                </CardContent>
            </Card>

            <Separator />

            {/* Waste Logs Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trash2 className="w-5 h-5 text-neutral-400" /> Historial de Desperdicios
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Ingrediente</TableHead>
                                <TableHead className="text-right">Cantidad</TableHead>
                                <TableHead>Motivo</TableHead>
                                <TableHead className="text-right">Coste Est.</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-neutral-400">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                                        Cargando registros...
                                    </TableCell>
                                </TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-neutral-400">
                                        <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        No hay desperdicios registrados. ¡Buen trabajo!
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => {
                                    const ing = log.ingredient
                                    const cost = log.quantity * (ing?.current_avg_price || 0)

                                    return (
                                        <TableRow key={log.id}>
                                            <TableCell className="font-mono text-sm text-neutral-500">
                                                {new Date(log.date).toLocaleDateString('es-ES')}
                                            </TableCell>
                                            <TableCell className="font-medium">{ing?.name || '—'}</TableCell>
                                            <TableCell className="text-right font-mono tabular-nums">
                                                {log.quantity.toFixed(2)} {ing?.base_unit || ''}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`text-[10px] ${REASON_COLORS[log.reason] || REASON_COLORS.OTRO}`}>
                                                    {WASTE_REASONS[log.reason] || log.reason}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono tabular-nums text-rose-600 text-sm">
                                                {fmt(cost)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-neutral-400 hover:text-rose-500"
                                                    onClick={() => handleDelete(log.id)}
                                                    disabled={isPending}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
