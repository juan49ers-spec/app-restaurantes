'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, X, Search, Plus } from "lucide-react"
import { toast } from "sonner"
import { confirmValidation, skipValidation, createAndMapIngredient } from "@/app/actions/validation"

export interface PendingItem {
    id: string
    raw_name: string
    raw_price: number | null
    raw_quantity: number | null
    raw_unit: string | null
    suggested_master_id: string | null
    confidence_score: number | null
    created_at: string
    invoice_id: string | null
    supplier_id: string | null
    invoices: { invoice_number: string; date: string } | null
    suppliers: { name: string } | null
    master_ingredients: { id: string; name: string } | null
}

export interface MasterIngredient {
    id: string
    name: string
    base_unit: string
    current_avg_price: number | null
}

interface ValidationInboxProps {
    items: PendingItem[]
    allIngredients: MasterIngredient[]
    restaurantId: string
}

export function ValidationInboxComponent({ items: initialItems, allIngredients, restaurantId }: ValidationInboxProps) {
    const [items, setItems] = useState(initialItems)
    // searchQuery removed
    const [selectedItem, setSelectedItem] = useState<string | null>(null)
    const [remapSearch, setRemapSearch] = useState('')
    const [newIngredientName, setNewIngredientName] = useState('')
    const [isCreating, setIsCreating] = useState(false)

    const filteredIngredients = allIngredients.filter(ing =>
        ing.name.toLowerCase().includes(remapSearch.toLowerCase())
    )

    const handleConfirm = async (itemId: string, masterIngredientId: string) => {
        try {
            await confirmValidation(itemId, masterIngredientId, restaurantId)
            setItems(prev => prev.filter(i => i.id !== itemId))
            setSelectedItem(null)
            toast.success('Ítem validado y memorizado')
        } catch {
            toast.error('Error al validar')
        }
    }

    const handleSkip = async (itemId: string) => {
        try {
            await skipValidation(itemId)
            setItems(prev => prev.filter(i => i.id !== itemId))
            toast.info('Ítem omitido')
        } catch {
            toast.error('Error al omitir')
        }
    }

    const handleCreateNew = async (itemId: string) => {
        if (!newIngredientName.trim()) {
            toast.error('Ingresa un nombre para el ingrediente')
            return
        }

        setIsCreating(true)
        try {
            await createAndMapIngredient(
                itemId,
                restaurantId,
                newIngredientName.trim()
            )
            setItems(prev => prev.filter(i => i.id !== itemId))
            setNewIngredientName('')
            toast.success(`Creado "${newIngredientName}" y memorizado`)
        } catch {
            toast.error('Error al crear ingrediente')
        } finally {
            setIsCreating(false)
        }
    }

    const getConfidenceBadge = (score: number | null) => {
        if (!score) return null
        if (score >= 0.7) return <Badge className="bg-green-100 text-green-800">{(score * 100).toFixed(0)}% match</Badge>
        if (score >= 0.5) return <Badge className="bg-yellow-100 text-yellow-800">{(score * 100).toFixed(0)}% match</Badge>
        return <Badge className="bg-red-100 text-red-800">{(score * 100).toFixed(0)}% match</Badge>
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-12">
                <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h2 className="text-lg font-semibold">¡Todo al día!</h2>
                <p className="text-muted-foreground">No hay ítems pendientes de validación</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {items.map(item => (
                <Card key={item.id} className="overflow-hidden">
                    <CardContent className="p-4">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <p className="font-medium text-sm text-muted-foreground">
                                    {item.suppliers?.name || 'Proveedor desconocido'}
                                </p>
                                <h3 className="font-semibold text-lg">{item.raw_name}</h3>
                            </div>
                            {getConfidenceBadge(item.confidence_score)}
                        </div>

                        {/* Price & Quantity */}
                        <div className="flex gap-4 text-sm text-muted-foreground mb-4">
                            {item.raw_price && <span>{item.raw_price.toFixed(2)}€</span>}
                            {item.raw_quantity && <span>{item.raw_quantity} {item.raw_unit || 'u'}</span>}
                            {item.invoices && <span>Factura: {item.invoices.invoice_number}</span>}
                        </div>

                        {/* Suggestion */}
                        {item.master_ingredients && (
                            <div className="bg-slate-50 rounded-lg p-3 mb-4">
                                <p className="text-xs text-muted-foreground mb-1">Sugerencia AI:</p>
                                <p className="font-medium">{item.master_ingredients.name}</p>
                            </div>
                        )}

                        {/* Actions */}
                        {selectedItem !== item.id ? (
                            <div className="flex gap-2">
                                {item.suggested_master_id && (
                                    <Button
                                        size="sm"
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                        onClick={() => handleConfirm(item.id, item.suggested_master_id!)}
                                    >
                                        <Check className="w-4 h-4 mr-1" /> Confirmar
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setSelectedItem(item.id)}
                                >
                                    <Search className="w-4 h-4 mr-1" /> Remapear
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleSkip(item.id)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3 border-t pt-3">
                                {/* Remap Search */}
                                <div>
                                    <Label className="text-xs">Buscar ingrediente existente:</Label>
                                    <Input
                                        placeholder="Buscar..."
                                        value={remapSearch}
                                        onChange={e => setRemapSearch(e.target.value)}
                                        className="mt-1"
                                    />
                                    {remapSearch && (
                                        <div className="max-h-32 overflow-y-auto mt-2 space-y-1">
                                            {filteredIngredients.slice(0, 5).map(ing => (
                                                <button
                                                    key={ing.id}
                                                    className="w-full text-left px-3 py-2 rounded bg-slate-50 hover:bg-slate-100 text-sm"
                                                    onClick={() => handleConfirm(item.id, ing.id)}
                                                >
                                                    {ing.name}
                                                </button>
                                            ))}
                                            {filteredIngredients.length === 0 && (
                                                <p className="text-sm text-muted-foreground px-3 py-2">No encontrado</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Create New */}
                                <div className="border-t pt-3">
                                    <Label className="text-xs">O crear nuevo ingrediente:</Label>
                                    <div className="flex gap-2 mt-1">
                                        <Input
                                            placeholder="Nombre del nuevo ingrediente..."
                                            value={newIngredientName}
                                            onChange={e => setNewIngredientName(e.target.value)}
                                        />
                                        <Button
                                            size="sm"
                                            disabled={isCreating || !newIngredientName.trim()}
                                            onClick={() => handleCreateNew(item.id)}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => {
                                        setSelectedItem(null)
                                        setRemapSearch('')
                                        setNewIngredientName('')
                                    }}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
