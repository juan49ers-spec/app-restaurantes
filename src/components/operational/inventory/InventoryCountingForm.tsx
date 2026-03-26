'use client'

import { useState, useMemo } from 'react'
import { InventoryCountItem, saveInventoryCount, completeInventorySession } from '@/app/actions/inventory'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Save, CheckCircle2, PackageCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useDebounceCallback } from 'usehooks-ts'

export function InventoryCountingForm({
    sessionId,
    initialItems
}: {
    sessionId: string,
    initialItems: InventoryCountItem[]
}) {
    const [items, setItems] = useState<InventoryCountItem[]>(initialItems)
    const [searchTerm, setSearchTerm] = useState('')
    const [isCompleting, setIsCompleting] = useState(false)
    const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
    const router = useRouter()

    const debouncedSave = useDebounceCallback(async (item: InventoryCountItem, newQty: number) => {
        try {
            setSavingIds(prev => new Set(prev).add(item.ingredient_id))
            await saveInventoryCount(
                sessionId,
                item.ingredient_id,
                newQty,
                item.current_avg_price,
                item.category
            )
            setSavingIds(prev => {
                const next = new Set(prev)
                next.delete(item.ingredient_id)
                return next
            })
        } catch (error) {
            console.error(error)
            toast.error("Error guardando recuento", {
                description: `No se pudo guardar la cantidad para ${item.name}`
            })
        }
    }, 1000)

    const handleQuantityChange = (ingredientId: string, val: string) => {
        const numVal = parseFloat(val)
        const validVal = isNaN(numVal) ? 0 : numVal

        setItems(current =>
            current.map(item => {
                if (item.ingredient_id === ingredientId) {
                    const updated = { ...item, quantity: validVal }
                    // Trigger backend save
                    debouncedSave(updated, validVal)
                    return updated
                }
                return item
            })
        )
    }

    const handleComplete = async () => {
        if (!confirm('¿Estás seguro de que has terminado el recuento? No podrás modificarlo después.')) return

        setIsCompleting(true)
        try {
            await completeInventorySession(sessionId)
            toast.success("¡Inventario completado!", {
                description: "Se ha registrado el corte correctamente.",
            })
            router.push('/operations/inventory')
        } catch (error) {
            toast.error("Error", {
                description: "No se pudo cerrar el inventario."
            })
            setIsCompleting(false)
        }
    }

    const filteredItems = useMemo(() => {
        if (!searchTerm) return items
        const lowerSearch = searchTerm.toLowerCase()
        return items.filter(item =>
            item.name.toLowerCase().includes(lowerSearch) ||
            item.category.toLowerCase().includes(lowerSearch)
        )
    }, [items, searchTerm])

    // Grouping for better UX
    const groupedItems = useMemo(() => {
        const groups: Record<string, InventoryCountItem[]> = {}
        filteredItems.forEach(item => {
            if (!groups[item.category]) groups[item.category] = []
            groups[item.category].push(item)
        })
        return groups
    }, [filteredItems])

    const totalCounted = items.filter(i => i.quantity > 0 || i.count_id).length

    return (
        <div className="space-y-6 pb-24">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 bg-background/95 backdrop-blur z-10 py-4 border-b">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <PackageCheck className="h-6 w-6 text-primary" />
                        Toma de Inventario
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {totalCounted} de {items.length} productos contados
                    </p>
                </div>
                <Button
                    onClick={handleComplete}
                    disabled={isCompleting || savingIds.size > 0}
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                >
                    {isCompleting ? 'Cerrando...' : (savingIds.size > 0 ? 'Guardando...' : 'Finalizar Inventario')}
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Buscar ingrediente o categoría..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-12 text-lg"
                />
            </div>

            <div className="space-y-8">
                {Object.entries(groupedItems).map(([category, catItems]) => (
                    <div key={category} className="space-y-3">
                        <h2 className="text-xl font-semibold bg-muted px-4 py-2 rounded-md sticky top-20 z-10">
                            {category}
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {catItems.map(item => (
                                <Card key={item.ingredient_id} className={`overflow-hidden transition-colors ${item.quantity > 0 ? 'border-primary/40 bg-primary/5' : ''}`}>
                                    <div className="flex items-center justify-between p-4">
                                        <div className="flex-1 pr-4">
                                            <p className="font-medium text-base line-clamp-1" title={item.name}>
                                                {item.name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Unidad: {item.base_unit}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 w-32 relative">
                                            <Input
                                                type="number"
                                                inputMode="decimal"
                                                min="0"
                                                step="0.01"
                                                value={item.quantity || ''}
                                                onChange={(e) => handleQuantityChange(item.ingredient_id, e.target.value)}
                                                className="text-right text-lg font-bold h-12 pr-8"
                                                placeholder="0.0"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                                {item.base_unit}
                                            </span>
                                            
                                            {/* Status Indicator */}
                                            {savingIds.has(item.ingredient_id) ? (
                                                <div className="absolute -right-1 -top-1">
                                                    <span className="relative flex h-3 w-3">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                                    </span>
                                                </div>
                                            ) : (item.quantity > 0 && (
                                                <div className="absolute -right-1 -top-1">
                                                     <CheckCircle2 className="h-4 w-4 text-green-500 fill-white rounded-full bg-white"/>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                ))}

                {Object.keys(groupedItems).length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        No se encontraron ingredientes para "{searchTerm}"
                    </div>
                )}
            </div>
        </div>
    )
}
