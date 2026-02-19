import { RecipeIngredientInput } from "@/hooks/useRecipeCalculator"
import { Input } from "@/components/ui/input"
import { SmartNumberInput } from "@/components/ui/smart-number-input"
import { Button } from "@/components/ui/button"
import { Trash2, Scale, ArrowRight, Tag } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CostBreakdownChart } from "./CostBreakdownChart"
import { useState, useEffect } from "react"

interface Props {
    ingredients: RecipeIngredientInput[]
    onUpdate: (id: string, updates: Partial<RecipeIngredientInput>) => void
    onRemove: (id: string) => void
    readOnly?: boolean
}

export function RecipeBuilder({ ingredients, onUpdate, onRemove, readOnly = false }: Props) {
    // Group by category
    const groupedIngredients = ingredients.reduce((acc, item) => {
        const cat = item.category || 'Otros'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(item)
        return acc
    }, {} as Record<string, typeof ingredients>)

    const categories = Object.keys(groupedIngredients).sort()

    if (ingredients.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 border-2 border-dashed border-muted-foreground/20 rounded-xl bg-muted/5">
                <Scale className="w-12 h-12 mb-4 opacity-20" />
                <h3 className="text-lg font-bold mb-2">Empieza tu Escandallo</h3>
                <p className="text-sm text-center max-w-xs">
                    Busca ingredientes en el panel izquierdo y añádelos para empezar a calcular costes.
                </p>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col">
            {/* INGREDIENT LIST (Scrollable) */}
            <div className="flex-1 overflow-auto p-4 space-y-6">
                {categories.map(category => (
                    <div key={category} className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                            <Tag className="w-3.5 h-3.5" />
                            {category}
                            <div className="h-px bg-border flex-1 ml-2" />
                        </div>

                        {groupedIngredients[category].map(item => {
                            const cost = item.quantity_gross * item.price_per_unit
                            const wasteQty = item.quantity_gross - item.quantity_net

                            return (
                                <Card key={item.id} className={`overflow-hidden transition-all duration-200 hover:shadow-md border-l-4 ${item.type === 'RECIPE' ? 'border-l-blue-500' : 'border-l-primary/50'}`}>
                                    <CardContent className="p-3 pl-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">

                                        {/* INFO BLOCK */}
                                        <div className="flex-1 min-w-[180px]">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-base line-clamp-1" title={item.name}>
                                                    {item.name}
                                                </span>
                                                {item.type === 'RECIPE' && (
                                                    <Badge variant="secondary" className="text-[10px] h-4 px-1">Sub-Receta</Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Scale className="w-3 h-3" />
                                                    {item.price_per_unit.toFixed(2)} €/{item.base_unit}
                                                </span>
                                                {item.yield_pct < 0.8 && (
                                                    <Badge variant="destructive" className="text-[10px] h-4 py-0 px-1 bg-red-100 text-red-700 hover:bg-red-200 border-0">
                                                        Alta Merma {((1 - item.yield_pct) * 100).toFixed(0)}%
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        {/* CONTROLS BLOCK */}
                                        <div className="flex items-start gap-3 w-full sm:w-auto">

                                            {/* 1. NET QUANTITY (Primary) */}
                                            <div className="space-y-1.5 flex-1 sm:flex-none">
                                                <Label className="text-[10px] uppercase font-black text-primary">En Receta *</Label>
                                                <div className="relative">
                                                    <SmartNumberInput
                                                        className="h-9 w-32 font-bold tabular-nums pr-8 border-primary/30 focus:border-primary"
                                                        value={item.quantity_net}
                                                        onValueChange={(val) => onUpdate(item.id, { quantity_net: val })}
                                                        disabled={readOnly}
                                                        autoFocus={item.quantity_net === 0}
                                                        placeholder=""
                                                    />
                                                    <span className="absolute right-2.5 top-2.5 text-xs font-bold text-muted-foreground pointer-events-none">
                                                        {item.base_unit}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* CONNECTOR */}
                                            <div className="pt-8 text-muted-foreground/30 hidden sm:block">
                                                <ArrowRight className="w-4 h-4" />
                                            </div>

                                            {/* 2. YIELD (Adjustment) */}
                                            <div className="space-y-1.5 flex-1 sm:flex-none min-w-[100px]">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Rendimiento %</Label>
                                                </div>
                                                <div className="relative group">
                                                    <Input
                                                        type="number"
                                                        className={`h-9 font-bold text-center ${item.yield_pct < 0.8 ? 'text-amber-600 border-amber-200 bg-amber-50' : ''
                                                            }`}
                                                        value={Math.round(item.yield_pct * 100)}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value)
                                                            if (!isNaN(val)) onUpdate(item.id, { yield_pct: val / 100 })
                                                        }}
                                                        disabled={readOnly}
                                                    />
                                                    {/* Quick Yield Selectors on Hover/Focus */}
                                                    {!readOnly && (
                                                        <div className="absolute top-full left-0 mt-1 bg-popover border shadow-lg rounded-md p-1 flex gap-1 z-10 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none group-focus-within:pointer-events-auto">
                                                            {[100, 95, 90, 80, 50].map(pct => (
                                                                <button
                                                                    key={pct}
                                                                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                                                                    onClick={() => onUpdate(item.id, { yield_pct: pct / 100 })}
                                                                >
                                                                    {pct}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 3. GROSS (Result) */}
                                            <div className="space-y-1.5 flex-1 sm:flex-none">
                                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">A Comprar</Label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        className="h-9 w-32 text-muted-foreground bg-muted/50 tabular-nums pr-8 border-dashed"
                                                        value={item.quantity_gross > 0 ? item.quantity_gross.toFixed(3) : ''}
                                                        onChange={(e) => onUpdate(item.id, { quantity_gross: parseFloat(e.target.value) || 0 })}
                                                        disabled={readOnly}
                                                    />
                                                    <div className="absolute right-2.5 top-2.5 text-xs text-muted-foreground pointer-events-none">
                                                        {item.base_unit}
                                                    </div>
                                                </div>
                                                {/* Waste Indicator */}
                                                {wasteQty > 0.001 && (
                                                    <div className="absolute top-[42px] right-0 text-[10px] text-destructive flex items-center gap-1 opacity-70">
                                                        <Trash2 className="w-3 h-3" />
                                                        -{wasteQty.toFixed(3)} {item.base_unit}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* COST & ACTIONS */}
                                        <div className="flex items-center gap-4 pl-4 border-l ml-auto sm:ml-0 w-full sm:w-auto justify-between sm:justify-end">
                                            <div className="text-right">
                                                <div className="font-black text-lg leading-none">
                                                    €{cost.toFixed(2)}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground font-medium">
                                                    €{(cost / (item.quantity_net || 1)).toFixed(2)} / {item.base_unit} neto
                                                </div>
                                            </div>
                                            {!readOnly && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-8 h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => onRemove(item.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>

                                    </CardContent>
                                    <CostBreakdownChart item={item} />
                                </Card>
                            )
                        })}
                    </div>
                ))}
            </div>

            {/* SUMMARY FOOTER - Now redundant with Header KPIS? Maybe remove or keep as sticky breakdown */}
        </div>
    )
}
