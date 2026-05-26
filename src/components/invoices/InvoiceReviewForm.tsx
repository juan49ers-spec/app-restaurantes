'use client'

import { useState, useRef, useEffect, useCallback } from "react"
import { Invoice, ScannedItem } from "@/types/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateInvoice } from "@/app/actions/review-invoice"
import { getIngredientPriceHistory } from "@/app/actions/ingredients"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle, ArrowRight, TrendingUp, TrendingDown, X, Trash2, Tag, Package, Lightbulb, Sparkles, Info } from "lucide-react"
import { Sparkline } from "@/components/charts/Sparkline"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface InvoiceReviewFormProps {
    invoice: Invoice
    ingredients: { id: string, name: string, base_unit: string, current_avg_price?: number, category?: string }[]
    suppliers: { id: string, name: string }[]
}

export function InvoiceReviewForm({ invoice, ingredients, suppliers }: InvoiceReviewFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const lastSelectedIndex = useRef<number | null>(null)

    // Initialize state with OCR data or defaults
    const [data, setData] = useState({
        invoice_number: invoice.invoice_number || invoice.scanned_data?.invoice_number || '',
        date: invoice.date || invoice.scanned_data?.date || '',
        supplier_id: invoice.supplier_id || '',
        total_amount: invoice.total_amount || invoice.scanned_data?.total_amount || 0,
        items: (invoice.scanned_data?.items || []) as ScannedItem[],
        idempotency_key: crypto.randomUUID()
    })

    const [mappings, setMappings] = useState<{ [key: number]: string }>(() => {
        const initialMappings: { [key: number]: string } = {}
        if (invoice.scanned_data?.items && ingredients.length > 0) {
            (invoice.scanned_data.items as ScannedItem[]).forEach((item, idx) => {
                if (!item.description) return
                const match = ingredients.find(i => i.name.toLowerCase() === item.description?.toLowerCase())
                if (match) {
                    initialMappings[idx] = match.id
                }
            })
        }
        return initialMappings
    })
    const [priceHistories, setPriceHistories] = useState<{ [ingId: string]: { date: string, price: number }[] }>({})

    // Bulk selection state
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
    const [autoGuessedIndices, setAutoGuessedIndices] = useState<Set<number>>(new Set())
    const [conversions, setConversions] = useState<{ [key: number]: number }>({}) // Index -> Pack Size (Default 1)

    // Helper to check price impact
    const getPriceVariance = (idx: number) => {
        const item = data.items[idx]
        const mappingId = mappings[idx]
        if (!mappingId || mappingId === 'new' || mappingId === 'ignore') return null

        const master = ingredients.find(i => i.id === mappingId)
        if (!master?.current_avg_price || !item.price) return null

        // 0 / 0 protection
        if (master.current_avg_price === 0) return null

        const variance = ((item.price - master.current_avg_price) / master.current_avg_price) * 100
        return variance
    }

    const handleItemChange = (index: number, field: keyof ScannedItem, value: string | number) => {
        const newItems = [...data.items]
        newItems[index] = { ...newItems[index], [field]: value }
        setData({ ...data, items: newItems })
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            const result = await updateInvoice(invoice.id!, {
                ...data,
                mappings,
                conversions
            })

            if (result.success) {
                toast.success("Factura procesada correctamente")
                router.push('/invoices')
            } else {
                toast.error(`Error: ${result.error}`)
            }
        } catch (error) {
            console.error(error)
            toast.error("Ocurrió un error inesperado")
        } finally {
            setLoading(false)
        }
    }

    // Bulk selection handlers
    const toggleSelection = (index: number, event?: React.MouseEvent) => {
        const newSelection = new Set(selectedIndices)

        // Shift+Click for range selection
        if (event?.shiftKey && lastSelectedIndex.current !== null) {
            const start = Math.min(lastSelectedIndex.current, index)
            const end = Math.max(lastSelectedIndex.current, index)

            for (let i = start; i <= end; i++) {
                newSelection.add(i)
            }
        } else {
            // Normal toggle
            if (newSelection.has(index)) {
                newSelection.delete(index)
            } else {
                newSelection.add(index)
            }
            lastSelectedIndex.current = index
        }

        setSelectedIndices(newSelection)
    }

    const toggleAll = () => {
        if (selectedIndices.size === data.items.length) {
            setSelectedIndices(new Set())
        } else {
            setSelectedIndices(new Set(data.items.map((_, idx) => idx)))
        }
    }

    const clearSelection = useCallback(() => {
        setSelectedIndices(new Set())
        lastSelectedIndex.current = null
    }, [])

    // Bulk actions
    const bulkIgnore = useCallback(() => {
        const previousMappings = { ...mappings }
        const newMappings = { ...mappings }
        selectedIndices.forEach(idx => {
            newMappings[idx] = 'ignore'
        })
        setMappings(newMappings)

        toast.success(`${selectedIndices.size} ítems marcados para ignorar`, {
            description: "Pulsa Deshacer si te has equivocado",
            action: {
                label: "Deshacer",
                onClick: () => setMappings(previousMappings)
            }
        })
        clearSelection()
    }, [mappings, selectedIndices, clearSelection])

    const bulkMapToIngredient = (ingredientId: string) => {
        const previousMappings = { ...mappings }
        const newMappings = { ...mappings }
        selectedIndices.forEach(idx => {
            newMappings[idx] = ingredientId
        })
        setMappings(newMappings)
        const ingredient = ingredients.find(i => i.id === ingredientId)

        toast.success(`${selectedIndices.size} ítems mapeados a "${ingredient?.name}"`, {
            description: "Pulsa Deshacer para revertir",
            action: {
                label: "Deshacer",
                onClick: () => setMappings(previousMappings)
            }
        })
        clearSelection()
    }

    // Power Feature: Heuristic Category Guessing on Mount
    useEffect(() => {
        const KEYWORDS: Record<string, string> = {
            "tomate": "Alimentación", "carne": "Alimentación", "pollo": "Alimentación",
            "cerveza": "Alcohol", "vino": "Alcohol",
            "lejía": "Limpieza", "jabón": "Limpieza",
            "servilleta": "Menaje"
        }

        let hasChanges = false
        const newItems = [...data.items]
        const guessed = new Set<number>()

        newItems.forEach((item, idx) => {
            if (!item.category && item.description) {
                const desc = item.description.toLowerCase()
                for (const [key, cat] of Object.entries(KEYWORDS)) {
                    if (desc.includes(key)) {
                        newItems[idx] = { ...item, category: cat }
                        guessed.add(idx) // Track guessed index
                        hasChanges = true
                        break
                    }
                }
            }
        })

        if (hasChanges) {
            setData(prev => ({ ...prev, items: newItems }))
            setAutoGuessedIndices(guessed)
            toast.info("Categorías sugeridas automáticamente por IA simple 🧠")
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Run once on mount

    // Power Feature: Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                clearSelection()
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedIndices.size > 0) {
                    // Confirm before delete? Or just do it with Undo?
                    // Let's do it directly for speed
                    bulkIgnore()
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selectedIndices, mappings, bulkIgnore, clearSelection]) // Re-bind on change to access current state

    // Power Feature: Progress Calculation
    const mappedCount = Object.keys(mappings).filter(k => mappings[parseInt(k)] !== 'new').length
    const progressPct = data.items.length > 0 ? (mappedCount / data.items.length) * 100 : 0




    const selectedCount = selectedIndices.size
    const totalCount = data.items.length
    const allSelected = selectedCount === totalCount && totalCount > 0
    const someSelected = selectedCount > 0 && selectedCount < totalCount

    const CATEGORIES = [
        "Alimentación", "Bebidas", "Alcohol", "Limpieza", "Menaje", "Mantenimiento", "Servicios", "Otros"
    ]

    const handleCategoryChange = (index: number, category: string) => {
        handleItemChange(index, 'category', category)
    }

    const bulkSetCategory = (category: string) => {
        const previousItems = [...data.items]
        const newItems = [...data.items]
        selectedIndices.forEach(idx => {
            newItems[idx] = { ...newItems[idx], category }
        })
        setData({ ...data, items: newItems })

        toast.success(`${selectedIndices.size} ítems asignados a "${category}"`, {
            description: "Pulsa Deshacer para revertir",
            action: {
                label: "Deshacer",
                onClick: () => setData({ ...data, items: previousItems })
            }
        })
        clearSelection()
    }


    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header Data Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-700 p-1.5 rounded-md">📄</span>
                        Datos Generales
                    </h2>

                    {/* Progress Bar */}
                    <div className="flex items-center gap-4 flex-1 justify-end px-8">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Progreso Revisión</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${progressPct === 100 ? 'text-green-600' : 'text-slate-600'}`}>{mappedCount} / {totalCount}</span>
                                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${progressPct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                        style={{ width: `${progressPct}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="text-right text-xs text-slate-500">
                        ID: {invoice.id?.slice(0, 8)}...
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500 uppercase">Proveedor</Label>
                        <Select
                            value={data.supplier_id}
                            onValueChange={(v) => setData({ ...data, supplier_id: v })}
                        >
                            <SelectTrigger className="bg-slate-50 border-slate-200 font-medium">
                                <SelectValue placeholder="Selecciona..." />
                            </SelectTrigger>
                            <SelectContent>
                                {suppliers.map(s => (
                                    <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {!data.supplier_id && invoice.scanned_data?.supplier?.name && (
                            <p className="text-[10px] text-amber-600 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Detectado: &quot;{invoice.scanned_data.supplier.name}&quot;
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500 uppercase">Fecha Emisión</Label>
                        <Input
                            type="date"
                            className="bg-slate-50 border-slate-200"
                            value={data.date}
                            onChange={(e) => setData({ ...data, date: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500 uppercase">Nº Factura</Label>
                        <Input
                            value={data.invoice_number}
                            className="bg-slate-50 border-slate-200 font-mono"
                            onChange={(e) => setData({ ...data, invoice_number: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500 uppercase">Total Importe</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">€</span>
                            <Input
                                type="number"
                                step="0.01"
                                className="pl-6 bg-slate-50 border-slate-200 font-bold text-slate-900"
                                value={data.total_amount}
                                onChange={(e) => setData({ ...data, total_amount: parseFloat(e.target.value) })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Onboarding / Tips Alert */}
            <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                <Lightbulb className="h-4 w-4 stroke-blue-600" />
                <AlertTitle className="text-blue-700 font-semibold flex items-center gap-2">
                    Trucos para ir más rápido
                </AlertTitle>
                <AlertDescription className="text-xs mt-1 text-blue-600/90 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <span className="flex items-center gap-1">• <strong>Shift + Click</strong> para seleccionar varios ítems</span>
                    <span className="flex items-center gap-1">• <strong>Supr/Backspace</strong> para ignorar selección</span>
                    <span className="flex items-center gap-1">• <strong>Esc</strong> para limpiar selección</span>
                </AlertDescription>
            </Alert>

            {/* Persistent Bulk Action Bar */}
            <div className="sticky top-4 z-20 transition-all duration-300">
                {selectedCount > 0 ? (
                    // Active State
                    <div className="bg-blue-600 text-white p-3 rounded-lg shadow-lg border border-blue-500 flex justify-between items-center animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={allSelected || (someSelected ? "indeterminate" : false)}
                                    onCheckedChange={toggleAll}
                                    className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-blue-600"
                                />
                                <span className="font-medium">
                                    {selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <Separator orientation="vertical" className="h-6 bg-white/30" />
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-white hover:bg-white/20 h-8"
                                    onClick={bulkIgnore}
                                >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Ignorar
                                </Button>
                                <Select onValueChange={bulkMapToIngredient}>
                                    <SelectTrigger className="w-[180px] h-8 bg-white border-transparent text-blue-700 hover:bg-blue-50 font-medium shadow-none">
                                        <Package className="w-4 h-4 mr-1 text-blue-500" />
                                        <span>Mapear a...</span>
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="bg-white text-slate-900 border-slate-200 shadow-xl">
                                        {ingredients.map(ing => (
                                            <SelectItem key={ing.id} value={ing.id!}>
                                                {ing.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select onValueChange={bulkSetCategory}>
                                    <SelectTrigger className="w-[160px] h-8 bg-white border-transparent text-blue-700 hover:bg-blue-50 font-medium shadow-none">
                                        <Tag className="w-4 h-4 mr-1 text-blue-500" />
                                        <span>Categoría...</span>
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="bg-white text-slate-900 border-slate-200 shadow-xl">
                                        {CATEGORIES.map(cat => (
                                            <SelectItem key={cat} value={cat}>
                                                {cat}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-white hover:bg-white/20 h-8"
                            onClick={clearSelection}
                        >
                            <X className="w-4 h-4 mr-1" />
                            Cancelar
                        </Button>
                    </div>
                ) : (
                    // Inactive/Guide State
                    <div className="bg-slate-50 text-slate-500 p-2 rounded-lg border border-slate-200 flex justify-between items-center opacity-70 hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-2 pl-2">
                                <Checkbox
                                    checked={allSelected || (someSelected ? "indeterminate" : false)}
                                    onCheckedChange={toggleAll}
                                    className="border-slate-300"
                                />
                                <span>Seleccionar todo</span>
                            </div>
                            <Separator orientation="vertical" className="h-4 bg-slate-300" />
                            <span className="flex items-center gap-2">
                                <Info className="w-3 h-3" />
                                Selecciona líneas para usar acciones en bloque (Ignorar, Categorizar...)
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Line Items Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-700">Líneas de Detalle</h3>
                    <div className="flex gap-2 text-xs">
                        <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">
                            <CheckCircle className="w-3 h-3" /> Mapeado
                        </span>
                        <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                            <AlertTriangle className="w-3 h-3" /> Revisar
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 hover:bg-slate-50">
                                <TableHead className="w-[40px] px-2">
                                    <Checkbox
                                        checked={allSelected || (someSelected ? "indeterminate" : false)}
                                        onCheckedChange={toggleAll}
                                        aria-label="Seleccionar todo"
                                    />
                                </TableHead>
                                <TableHead className="w-[25%]">Descripción Original (OCR)</TableHead>
                                <TableHead className="w-[20%]">Mapear a Ingrediente</TableHead>
                                <TableHead className="w-[15%]">Categoría</TableHead>
                                <TableHead className="w-[8%] text-center">Formato</TableHead>
                                <TableHead className="w-[8%] text-center">Cant.</TableHead>
                                <TableHead className="w-[14%] text-right">Precio/Ud.</TableHead>
                                <TableHead className="w-[14%] text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.items.map((item, idx) => {
                                const variance = getPriceVariance(idx);
                                const isMapped = mappings[idx] && mappings[idx] !== 'new' && mappings[idx] !== 'ignore';
                                const mappedId = mappings[idx];
                                const isSelected = selectedIndices.has(idx);

                                // Fetch history on hover or mount if mapped
                                const handleMouseEnter = async () => {
                                    if (mappedId && mappedId !== 'new' && mappedId !== 'ignore' && !priceHistories[mappedId]) {
                                        const history = await getIngredientPriceHistory(mappedId)
                                        setPriceHistories(prev => ({ ...prev, [mappedId]: history }))
                                    }
                                }

                                return (
                                    <TableRow
                                        key={idx}
                                        className={`transition-all duration-200 
                                            ${mappings[idx] === 'ignore' ? "opacity-40 grayscale bg-slate-100" : ""}
                                            ${!isMapped ? "bg-amber-50/30" : ""} 
                                            ${isSelected ? "bg-blue-50/50 !opacity-100 !grayscale-0" : ""}
                                        `}
                                        onMouseEnter={handleMouseEnter}
                                        data-state={isSelected ? "selected" : undefined}
                                    >
                                        <TableCell className="px-2">
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleSelection(idx)}
                                                onClick={(e) => toggleSelection(idx, e)}
                                                aria-label={`Seleccionar ítem ${idx + 1}`}
                                            />
                                        </TableCell>
                                        <TableCell className="relative group/cell">
                                            {autoGuessedIndices.has(idx) && (
                                                <div className="absolute -left-2 top-3" title="Categoría sugerida por IA">
                                                    <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
                                                </div>
                                            )}
                                            <Input
                                                value={item.description}
                                                onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                                className="h-8 text-xs border-transparent hover:border-slate-200 focus:border-blue-500 bg-transparent"
                                                placeholder="Descripción..."
                                            />
                                            {/* Floating Sparkline on Hover if Mapped */}
                                            {isMapped && priceHistories[mappedId] && priceHistories[mappedId].length > 1 && (
                                                <div className="absolute left-0 top-full mt-1 z-50 bg-white p-2 rounded shadow-xl border border-slate-100 hidden group-hover/cell:block w-[120px]">
                                                    <p className="text-[10px] text-slate-400 mb-1">Tendencia Precio</p>
                                                    <Sparkline data={priceHistories[mappedId]} width={100} height={30} />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                value={mappings[idx] || 'new'}
                                                onValueChange={(v) => setMappings({ ...mappings, [idx]: v })}
                                            >
                                                <SelectTrigger className={`h-8 text-xs ${isMapped ? "bg-green-50 border-green-200 text-green-700 font-medium" : "bg-white"}`}>
                                                    <SelectValue placeholder="Buscar ingrediente..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="new" className="text-blue-600 font-medium">+ Crear Nuevo</SelectItem>
                                                    <SelectItem value="ignore" className="text-slate-400">Ignorar línea</SelectItem>
                                                    <Separator className="my-1" />
                                                    {ingredients.map(ing => (
                                                        <SelectItem key={ing.id} value={ing.id || ''}>{ing.name} ({ing.base_unit})</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            {(!mappedId || mappedId === 'new') ? (
                                                <Select
                                                    value={item.category || ''}
                                                    onValueChange={(v) => handleCategoryChange(idx, v)}
                                                >
                                                    <SelectTrigger className="h-8 text-xs bg-transparent border-transparent hover:border-slate-200 shadow-none">
                                                        <SelectValue placeholder="-" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <span className="text-[10px] text-slate-500 pl-2 block truncate max-w-[100px]" title={ingredients.find(i => i.id === mappedId)?.category}>
                                                    {ingredients.find(i => i.id === mappedId)?.category || '-'}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-center gap-1" title="Unidades por Pack (ej. 12 botellas por caja)">
                                                <span className="text-[10px] text-slate-400">x</span>
                                                <Input
                                                    type="number"
                                                    value={conversions[idx] || 1}
                                                    onChange={(e) => setConversions({ ...conversions, [idx]: parseFloat(e.target.value) || 1 })}
                                                    className="h-8 w-12 text-center text-xs bg-slate-50 border-transparent hover:border-slate-200 focus:bg-white"
                                                    min={1}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                value={item.qty}
                                                onChange={(e) => handleItemChange(idx, 'qty', parseFloat(e.target.value))}
                                                className="h-8 text-xs text-center border-slate-100"
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="relative flex items-center justify-end gap-2">
                                                {variance !== null && Math.abs(variance) > 5 && (
                                                    <Badge variant="outline" className={`h-5 text-[10px] px-1 gap-0.5 ${variance > 0 ? "border-red-200 bg-red-50 text-red-600" : "border-green-200 bg-green-50 text-green-600"}`}>
                                                        {variance > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                                        {Math.abs(variance).toFixed(0)}%
                                                    </Badge>
                                                )}
                                                <Input
                                                    type="number" step="0.01"
                                                    value={item.price}
                                                    onChange={(e) => handleItemChange(idx, 'price', parseFloat(e.target.value))}
                                                    className="h-8 text-xs text-right w-20 border-slate-100 font-medium"
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs">
                                            {(item.qty && item.price) ? (item.qty * item.price).toFixed(2) : item.total} €
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
                <div className="p-2 border-t bg-slate-50">
                    <Button variant="ghost" size="sm" className="w-full text-blue-600 h-8" onClick={() => {
                        setData({
                            ...data,
                            items: [...data.items, { description: '', qty: 1, price: 0 } as ScannedItem]
                        })
                    }}>
                        + Añadir Línea Manual
                    </Button>
                </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="sticky bottom-4 z-10">
                <div className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl flex justify-between items-center max-w-2xl mx-auto border border-slate-700/50 backdrop-blur-sm bg-slate-900/90">
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-400">Total Factura</span>
                        <span className="font-bold text-xl">{data.total_amount?.toFixed(2)} €</span>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800" onClick={() => router.back()}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20">
                            {loading ? (
                                <span className="flex items-center gap-2">Guardando...</span>
                            ) : (
                                <span className="flex items-center gap-2">Confirmar e Inventariar <ArrowRight className="w-4 h-4" /></span>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
