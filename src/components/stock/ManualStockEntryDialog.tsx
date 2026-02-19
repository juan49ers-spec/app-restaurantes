'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Package } from "lucide-react"
import { toast } from "sonner"
import { getIngredients } from "@/app/actions/ingredients"
import { addManualStockMovement } from "@/app/actions/stock-actions"
import { MasterIngredient } from "@/types/schema"

interface ManualStockEntryDialogProps {
    trigger?: React.ReactNode
    onSuccess?: () => void
}

export function ManualStockEntryDialog({ trigger, onSuccess }: ManualStockEntryDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [ingredients, setIngredients] = useState<MasterIngredient[]>([])

    // Form State
    const [ingredientId, setIngredientId] = useState("")
    const [quantity, setQuantity] = useState(1)
    const [packSize, setPackSize] = useState(1)
    const [price, setPrice] = useState<number | undefined>(undefined)
    const [notes, setNotes] = useState("")

    // Fetch ingredients on open
    useEffect(() => {
        if (open && ingredients.length === 0) {
            getIngredients()
                .then(setIngredients)
                .catch(() => toast.error("Error cargando ingredientes"))
        }
    }, [open, ingredients.length])

    const selectedIngredient = ingredients.find(i => i.id === ingredientId)
    const totalQty = quantity * packSize

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!ingredientId) return toast.error("Selecciona un ingrediente")

        setLoading(true)
        try {
            await addManualStockMovement({
                ingredientId,
                quantity: totalQty,
                type: 'MANUAL_ADD',
                price: price ? (price / packSize) : undefined, // Normalize price to base unit
                notes: notes || "Entrada manual",
            })

            toast.success("Stock añadido correctamente", {
                description: `+${totalQty} ${selectedIngredient?.base_unit} de ${selectedIngredient?.name}`
            })

            setOpen(false)
            resetForm()
            onSuccess?.()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Error al añadir stock")
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setIngredientId("")
        setQuantity(1)
        setPackSize(1)
        setPrice(undefined)
        setNotes("")
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                        <Plus className="w-4 h-4" />
                        Entrada Manual
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Entrada Manual de Stock</DialogTitle>
                        <DialogDescription>
                            Registra compras rápidas o ajustes de inventario.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="ingredient">Ingrediente</Label>
                            <Select value={ingredientId} onValueChange={setIngredientId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Buscar ingrediente..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    {ingredients.map(ing => (
                                        <SelectItem key={ing.id} value={ing.id || ''}>
                                            {ing.name} ({ing.base_unit})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="qty">Cantidad</Label>
                                <Input
                                    id="qty"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={quantity}
                                    onChange={(e) => setQuantity(parseFloat(e.target.value))}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="packSize" className="flex items-center gap-1 text-slate-500">
                                    Formato <Package className="w-3 h-3" />
                                </Label>
                                <Input
                                    id="packSize"
                                    type="number"
                                    min="1"
                                    value={packSize}
                                    onChange={(e) => setPackSize(parseFloat(e.target.value))}
                                    className="text-center"
                                />
                            </div>
                        </div>

                        {selectedIngredient && (
                            <div className="bg-slate-50 p-2 rounded text-xs text-slate-600 flex justify-between">
                                <span>Total a añadir:</span>
                                <span className="font-bold">
                                    {totalQty} {selectedIngredient.base_unit}
                                </span>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="price">Precio Total (Opcional)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                                <Input
                                    id="price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="pl-7"
                                    value={price || ''}
                                    onChange={(e) => setPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                            </div>
                            <p className="text-[10px] text-slate-400">
                                Si introduces el precio, se actualizará el coste medio del ingrediente.
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="notes">Notas</Label>
                            <Textarea
                                id="notes"
                                placeholder="Ej: Compra emergencia Mercadona"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="h-16 resize-none"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading || !ingredientId}>
                            {loading ? "Guardando..." : "Confirmar Entrada"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
