"use client"

import { m } from "framer-motion"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
    ChevronLeft, ChevronRight, X, DollarSign, Scale,
    Calculator, ArrowRight, Lightbulb, BarChart3, Target, PartyPopper
} from "lucide-react"
import type { SimulatedMenuItem } from "../MenuEngineeringContext"
import { MenuIntelligence } from "../menu-intelligence"
import { CLASSIFICATION_LABELS, QUICK_ACTIONS } from "./constants"

interface ItemEditorPanelProps {
    editingItem: SimulatedMenuItem
    originalEditingItem: SimulatedMenuItem | undefined
    avgMargin: number
    avgPopularity: number
    simulatedItems: SimulatedMenuItem[]
    updateSimulatedItem: (id: string, field: 'price' | 'cost', value: number) => void
    onNavigate: (direction: 'prev' | 'next') => void
    onClose: () => void
}

export function ItemEditorPanel({
    editingItem,
    originalEditingItem,
    avgMargin,
    avgPopularity,
    simulatedItems,
    updateSimulatedItem,
    onNavigate,
    onClose
}: ItemEditorPanelProps) {
    const applyQuickAction = (field: 'price' | 'cost', factor: number) => {
        const current = Number(editingItem[field])
        const newVal = Math.max(0, current * (1 + factor))
        updateSimulatedItem(editingItem.id, field, Math.round(newVal * 100) / 100)
    }

    const advice = MenuIntelligence.analyzeItem(editingItem, avgMargin, avgPopularity * 100, simulatedItems)
    const topAdvice = advice[0]
    const classChanged = originalEditingItem && originalEditingItem.classification !== editingItem.classification
    const improvedClass = classChanged && (
        (editingItem.classification === 'STAR') ||
        (editingItem.classification === 'PLOWHORSE' && originalEditingItem?.classification === 'DOG') ||
        (editingItem.classification === 'PUZZLE' && originalEditingItem?.classification === 'DOG')
    )

    return (
        <m.div
            key={editingItem.id}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            className="absolute bottom-6 left-6 right-6 z-20"
        >
            <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden">
                {/* Editor Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/5 bg-amber-500/5">
                    <div className="flex items-center gap-3">
                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => onNavigate('prev')}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                <Calculator className="w-3.5 h-3.5 text-amber-600" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold leading-tight">{editingItem.name}</h4>
                                <div className="flex items-center gap-1.5 text-[10px]">
                                    <Badge variant="outline" className={cn(
                                        "h-4 px-1 text-[8px] font-black border-none",
                                        editingItem.classification === 'STAR' && "bg-emerald-500/20 text-emerald-600",
                                        editingItem.classification === 'PLOWHORSE' && "bg-amber-500/20 text-amber-600",
                                        editingItem.classification === 'PUZZLE' && "bg-violet-500/20 text-violet-600",
                                        editingItem.classification === 'DOG' && "bg-rose-500/20 text-rose-600",
                                    )}>
                                        {CLASSIFICATION_LABELS[editingItem.classification || 'DOG']}
                                    </Badge>
                                    {originalEditingItem && originalEditingItem.classification !== editingItem.classification && (
                                        <>
                                            <ArrowRight className="w-2.5 h-2.5 text-amber-500" />
                                            <Badge variant="outline" className={cn(
                                                "h-4 px-1 text-[8px] font-black border-none animate-pulse",
                                                editingItem.classification === 'STAR' && "bg-emerald-500/20 text-emerald-600",
                                                editingItem.classification === 'PLOWHORSE' && "bg-amber-500/20 text-amber-600",
                                                editingItem.classification === 'PUZZLE' && "bg-violet-500/20 text-violet-600",
                                                editingItem.classification === 'DOG' && "bg-rose-500/20 text-rose-600",
                                            )}>
                                                {CLASSIFICATION_LABELS[editingItem.classification || 'DOG']} ✓
                                            </Badge>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => onNavigate('next')}>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={onClose}>
                        <X className="w-3.5 h-3.5" />
                    </Button>
                </div>

                {/* Editor Body */}
                <div className="px-4 py-3 grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Price Column */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                <DollarSign className="w-3 h-3" /> Precio
                            </span>
                            <div className="flex items-center gap-1.5">
                                {originalEditingItem && Number(originalEditingItem.price) !== Number(editingItem.price) && (
                                    <span className="text-[10px] font-mono text-muted-foreground/50 line-through">€{Number(originalEditingItem.price).toFixed(2)}</span>
                                )}
                                <span className="text-xs font-mono font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">
                                    €{Number(editingItem.price).toFixed(2)}
                                </span>
                            </div>
                        </div>
                        <Slider
                            value={[Number(editingItem.price)]}
                            min={0}
                            max={Math.max(Number(editingItem.price) * 2, 30)}
                            step={0.5}
                            onValueChange={([val]) => updateSimulatedItem(editingItem.id, 'price', val)}
                        />
                        <div className="flex gap-1">
                            {QUICK_ACTIONS.map(action => (
                                <button
                                    key={`price-${action.label}`}
                                    onClick={() => applyQuickAction('price', action.factor)}
                                    className={cn("flex-1 text-[9px] font-bold py-1 rounded-md border transition-all", action.color)}
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Cost Column */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                <Scale className="w-3 h-3" /> Coste
                            </span>
                            <div className="flex items-center gap-1.5">
                                {originalEditingItem && Number(originalEditingItem.cost) !== Number(editingItem.cost) && (
                                    <span className="text-[10px] font-mono text-muted-foreground/50 line-through">€{Number(originalEditingItem.cost).toFixed(2)}</span>
                                )}
                                <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400 px-1.5 py-0.5 rounded">
                                    €{Number(editingItem.cost).toFixed(2)}
                                </span>
                            </div>
                        </div>
                        <Slider
                            value={[Number(editingItem.cost)]}
                            min={0}
                            max={Math.max(Number(editingItem.cost) * 2, 20)}
                            step={0.1}
                            onValueChange={([val]) => updateSimulatedItem(editingItem.id, 'cost', val)}
                        />
                        <div className="flex gap-1">
                            {QUICK_ACTIONS.map(action => (
                                <button
                                    key={`cost-${action.label}`}
                                    onClick={() => applyQuickAction('cost', action.factor)}
                                    className={cn("flex-1 text-[9px] font-bold py-1 rounded-md border transition-all", action.color)}
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* AI Advice Row */}
                <div className="px-4 py-2 border-t border-black/5 dark:border-white/5">
                    {improvedClass && (
                        <m.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mb-2 p-2 rounded-lg bg-gradient-to-r from-emerald-500/10 to-amber-500/10 border border-emerald-500/20 flex items-center gap-2 text-[11px]"
                        >
                            <PartyPopper className="w-4 h-4 text-emerald-500 animate-bounce" />
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                ¡{editingItem.name} ha ascendido a {CLASSIFICATION_LABELS[editingItem.classification || 'DOG']}!
                            </span>
                        </m.div>
                    )}
                    {topAdvice && (
                        <div className="flex items-start gap-2 text-[10px]">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <span className="font-bold text-amber-700 dark:text-amber-400">{topAdvice.title}</span>
                                <p className="text-muted-foreground mt-0.5 leading-relaxed">{topAdvice.description}</p>
                                {topAdvice.impact && (
                                    <Badge variant="outline" className="mt-1 h-4 text-[8px] font-bold border-emerald-500/30 text-emerald-600">
                                        <Target className="w-2.5 h-2.5 mr-0.5" />{topAdvice.impact}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Editor Footer — Live KPIs */}
                <div className="px-4 py-2.5 border-t border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                    <div className="flex items-center justify-between">
                        <div className="flex gap-4 text-[10px]">
                            <span className="text-muted-foreground">
                                Margen: <strong className="text-emerald-600 font-mono">€{(Number(editingItem.price) - Number(editingItem.cost)).toFixed(2)}</strong>
                                {originalEditingItem && (
                                    <span className="text-muted-foreground/40 ml-1">
                                        (era €{(Number(originalEditingItem.price) - Number(originalEditingItem.cost)).toFixed(2)})
                                    </span>
                                )}
                            </span>
                            <span className="text-muted-foreground">
                                Food Cost: <strong className={cn("font-mono", Number(editingItem.cost) / Number(editingItem.price) * 100 > 35 ? 'text-rose-600' : 'text-emerald-600')}>
                                    {(Number(editingItem.cost) / Number(editingItem.price) * 100).toFixed(1)}%
                                </strong>
                            </span>
                            <span className="text-muted-foreground">
                                Beneficio/día: <strong className="text-foreground font-mono">
                                    €{((Number(editingItem.price) - Number(editingItem.cost)) * editingItem.quantity_sold).toFixed(0)}
                                </strong>
                            </span>
                            <span className="text-muted-foreground">
                                <BarChart3 className="w-3 h-3 inline mr-0.5" />
                                Mensual: <strong className="text-foreground font-mono">
                                    €{((Number(editingItem.price) - Number(editingItem.cost)) * editingItem.quantity_sold * 30).toFixed(0)}
                                </strong>
                            </span>
                        </div>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-3 font-bold" onClick={onClose}>
                            Listo ✓
                        </Button>
                    </div>
                </div>
            </div>
        </m.div>
    )
}
