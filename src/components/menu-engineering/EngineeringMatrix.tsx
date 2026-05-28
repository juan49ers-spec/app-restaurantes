"use client"

import { m, AnimatePresence } from "framer-motion"
import { Slider } from "@/components/ui/slider"
import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { useMenuEngineering, SimulatedMenuItem } from "./MenuEngineeringContext"
import {
    RotateCcw,
    Calculator, X, DollarSign, Scale, TrendingUp,
    TrendingDown, ArrowRight, Zap, ChevronLeft, ChevronRight,
    Lightbulb, BarChart3, Target, PartyPopper
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import MenuAdvisor from "./MenuAdvisor"
import { MenuIntelligence } from "./menu-intelligence"
import { EngineeringMatrixChart, type ChartDataItem } from "./EngineeringMatrixChart"
import { EngineeringMatrixHeader } from "./EngineeringMatrixHeader"
import { SimulationStartBanner } from "./SimulationStartBanner"

interface EngineeringMatrixProps {
    items: SimulatedMenuItem[]
    avgPopularity: number
    avgMargin: number
}

const CLASSIFICATION_LABELS: Record<string, string> = {
    STAR: 'Estrella',
    PLOWHORSE: 'Vaca',
    PUZZLE: 'Enigma',
    DOG: 'Perro'
}

const QUICK_ACTIONS = [
    { label: '-10%', factor: -0.10, color: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border-rose-200 dark:border-rose-500/20' },
    { label: '-5%', factor: -0.05, color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 border-amber-200 dark:border-amber-500/20' },
    { label: '+5%', factor: 0.05, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/20' },
    { label: '+10%', factor: 0.10, color: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-500/15 hover:bg-emerald-200 dark:hover:bg-emerald-500/25 border-emerald-300 dark:border-emerald-500/30' },
]

export function EngineeringMatrix({ items, avgPopularity, avgMargin }: EngineeringMatrixProps) {
    const {
        hoveredCategory,
        selectedCategory,
        setSelectedCategory,
        isSimulationMode,
        setIsSimulationMode,
        originalItems,
        simulatedItems,
        updateSimulatedItem,
        resetSimulation,
        revenueDelta,
        cogsDelta,
        scenarios,
        currentScenarioId,
        saveScenario,
        loadScenario,
        deleteScenario,
        isSaving
    } = useMenuEngineering()

    const [newScenarioName, setNewScenarioName] = useState("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingItemId, setEditingItemId] = useState<string | null>(null)

    const editingItem = editingItemId ? simulatedItems.find(i => i.id === editingItemId) : null
    const originalEditingItem = editingItemId ? originalItems.find(i => i.id === editingItemId) : null

    const data: ChartDataItem[] = useMemo(() => items.map((item: SimulatedMenuItem) => {
        const original = originalItems?.find(oi => oi.id === item.id)
        return {
            id: item.id,
            name: item.recipe?.name || 'Receta',
            x: Number(item.contribution_margin),
            y: Number(item.popularity_pct) * 100,
            z: Number(item.quantity_sold),
            classification: item.classification || 'DOG',
            originalX: original ? Number(original.contribution_margin) : Number(item.contribution_margin),
            originalY: original ? Number(original.popularity_pct) * 100 : Number(item.popularity_pct) * 100,
            hasMoved: original ? (Math.abs(Number(original.contribution_margin) - Number(item.contribution_margin)) > 0.01) : false
        }
    }), [items, originalItems])

    const dataMaxX = Math.max(...data.map((d) => d.x), avgMargin * 1.5)
    const xDomainMax = Math.max(dataMaxX * 1.15, avgMargin * 1.5, 1)
    const dataMaxY = Math.max(...data.map((d) => d.y), avgPopularity * 100 * 1.5)
    const yDomainMax = Math.max(dataMaxY * 1.15, avgPopularity * 100 * 1.5, 1)

    const simStats = useMemo(() => {
        const itemsChanged = data.filter(d => d.hasMoved).length
        const profitDelta = revenueDelta - cogsDelta
        return { itemsChanged, profitDelta }
    }, [data, revenueDelta, cogsDelta])

    const handleSave = async () => {
        if (!newScenarioName) return
        await saveScenario(newScenarioName)
        setNewScenarioName("")
        setIsDialogOpen(false)
    }

    const navigateItem = (direction: 'prev' | 'next') => {
        const currentIndex = simulatedItems.findIndex(i => i.id === editingItemId)
        if (currentIndex === -1) return
        const newIndex = direction === 'next'
            ? (currentIndex + 1) % simulatedItems.length
            : (currentIndex - 1 + simulatedItems.length) % simulatedItems.length
        setEditingItemId(simulatedItems[newIndex].id)
    }

    const applyQuickAction = (field: 'price' | 'cost', factor: number) => {
        if (!editingItem) return
        const current = Number(editingItem[field])
        const newVal = Math.max(0, current * (1 + factor))
        updateSimulatedItem(editingItem.id, field, Math.round(newVal * 100) / 100)
    }

    const autoOptimize = () => {
        simulatedItems.forEach(item => {
            const classification = item.classification
            const price = Number(item.price)
            const cost = Number(item.cost)
            const foodCost = cost / price

            if (classification === 'DOG') {
                updateSimulatedItem(item.id, 'price', Math.round(price * 1.08 * 100) / 100)
                updateSimulatedItem(item.id, 'cost', Math.round(cost * 0.95 * 100) / 100)
            } else if (classification === 'PLOWHORSE') {
                updateSimulatedItem(item.id, 'price', Math.round(price * 1.05 * 100) / 100)
            } else if (classification === 'PUZZLE') {
                updateSimulatedItem(item.id, 'cost', Math.round(cost * 0.95 * 100) / 100)
            } else if (classification === 'STAR' && foodCost > 0.30) {
                updateSimulatedItem(item.id, 'cost', Math.round(cost * 0.97 * 100) / 100)
            }
        })
    }

    return (
        <div className="flex flex-col lg:flex-row gap-6">
            <div className={cn(
                "flex-1 h-[680px] glass-card rounded-3xl relative overflow-hidden group transition-all duration-1000 p-6 flex flex-col",
                isSimulationMode && "ring-4 ring-amber-500/20 shadow-2xl shadow-amber-500/10"
            )}>
                {isSimulationMode && (
                    <div className="absolute inset-0 pointer-events-none z-[1]">
                        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.02] via-transparent to-amber-500/[0.02]" />
                    </div>
                )}

                <EngineeringMatrixHeader
                    isSimulationMode={isSimulationMode}
                    setIsSimulationMode={setIsSimulationMode}
                    clearEditingItem={() => setEditingItemId(null)}
                    scenarios={scenarios}
                    currentScenarioId={currentScenarioId}
                    loadScenario={loadScenario}
                    deleteScenario={deleteScenario}
                    isSaving={isSaving}
                    isDialogOpen={isDialogOpen}
                    setIsDialogOpen={setIsDialogOpen}
                    newScenarioName={newScenarioName}
                    setNewScenarioName={setNewScenarioName}
                    handleSave={handleSave}
                />

                <EngineeringMatrixChart
                    data={data}
                    avgPopularity={avgPopularity}
                    avgMargin={avgMargin}
                    xDomainMax={xDomainMax}
                    yDomainMax={yDomainMax}
                    hoveredCategory={hoveredCategory}
                    selectedCategory={selectedCategory}
                    isSimulationMode={isSimulationMode}
                    editingItemId={editingItemId}
                    onEditItem={setEditingItemId}
                />

                <SimulationStartBanner
                    isVisible={isSimulationMode && !editingItem && simStats.itemsChanged === 0}
                    simulatedItems={simulatedItems}
                    onSelectItem={setEditingItemId}
                    onAutoOptimize={autoOptimize}
                    onReset={resetSimulation}
                    onClose={() => setIsSimulationMode(false)}
                />

                <AnimatePresence>
                    {isSimulationMode && !editingItem && simStats.itemsChanged > 0 && (
                        <m.div
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 24 }}
                            transition={{ type: "spring", damping: 20, stiffness: 300 }}
                            className="absolute bottom-6 left-6 right-6 z-20"
                        >
                            <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden">
                                <div className="flex overflow-x-auto lg:grid lg:grid-cols-5 divide-x divide-black/5 dark:divide-white/5 scrollbar-thin scrollbar-thumb-amber-500/20 scrollbar-track-transparent pb-1 lg:pb-0">
                                    <div className="p-3 text-center min-w-[110px] flex-shrink-0">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Platos Tocados</p>
                                        <p className="text-lg font-black text-amber-600 font-mono">{simStats.itemsChanged}</p>
                                    </div>
                                    <div className="p-3 text-center min-w-[110px] flex-shrink-0">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Δ Ingresos</p>
                                        <p className={cn("text-lg font-black font-mono flex items-center justify-center gap-1", revenueDelta >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                            {revenueDelta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                            {revenueDelta >= 0 ? "+" : ""}€{Math.abs(revenueDelta).toFixed(0)}
                                        </p>
                                    </div>
                                    <div className="p-3 text-center min-w-[110px] flex-shrink-0">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Δ Beneficio</p>
                                        <p className={cn("text-lg font-black font-mono flex items-center justify-center gap-1", simStats.profitDelta >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                            {simStats.profitDelta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                            {simStats.profitDelta >= 0 ? "+" : ""}€{Math.abs(simStats.profitDelta).toFixed(0)}
                                        </p>
                                    </div>
                                    <div className="p-3 text-center min-w-[110px] flex-shrink-0">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Δ Costes</p>
                                        <p className={cn("text-lg font-black font-mono flex items-center justify-center gap-1", cogsDelta <= 0 ? "text-emerald-600" : "text-rose-600")}>
                                            {cogsDelta <= 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                                            {cogsDelta > 0 ? "+" : ""}€{Math.abs(cogsDelta).toFixed(0)}
                                        </p>
                                    </div>
                                    <div className="p-3 text-center bg-emerald-50/50 dark:bg-emerald-500/5 min-w-[110px] flex-shrink-0">
                                        <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Impacto Mensual</p>
                                        <p className={cn("text-lg font-black font-mono flex items-center justify-center gap-1", simStats.profitDelta >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                            {simStats.profitDelta >= 0 ? "+" : ""}€{Math.abs(simStats.profitDelta * 30).toFixed(0)}
                                        </p>
                                    </div>
                                </div>

                                <div className="px-4 py-2 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-y-2 bg-black/[0.02] dark:bg-white/[0.02]">
                                    <div className="flex items-center gap-1 lg:gap-2 w-full lg:w-auto overflow-x-auto scrollbar-none">
                                        <Button size="sm" variant="ghost" className="h-7 text-[10px] flex-shrink-0" onClick={() => setEditingItemId(simulatedItems[0]?.id || null)}>
                                            <Calculator className="w-3 h-3 mr-1" /> Editar Platos
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-7 text-[10px] flex-shrink-0" onClick={autoOptimize}>
                                            <Zap className="w-3 h-3 mr-1" /> Re-Optimizar
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-1 lg:gap-2 justify-end w-full lg:w-auto">
                                        <Button size="sm" variant="ghost" className="h-7 text-[10px] text-muted-foreground" onClick={resetSimulation}>
                                            <RotateCcw className="w-3 h-3 mr-1" /> Reset
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-7 text-[10px] text-muted-foreground" onClick={() => setIsSimulationMode(false)}>
                                            <X className="w-3 h-3 mr-1" /> Salir
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </m.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {isSimulationMode && editingItem && (
                        <m.div
                            key={editingItemId}
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", damping: 22, stiffness: 300 }}
                            className="absolute bottom-6 left-6 right-6 z-20"
                        >
                            <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 dark:border-white/5 bg-amber-500/5">
                                    <div className="flex items-center gap-3">
                                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => navigateItem('prev')}>
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
                                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => navigateItem('next')}>
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={() => setEditingItemId(null)}>
                                        <X className="w-3.5 h-3.5" />
                                    </Button>
                                </div>

                                <div className="px-4 py-3 grid grid-cols-1 lg:grid-cols-2 gap-5">
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

                                {(() => {
                                    const advice = MenuIntelligence.analyzeItem(editingItem, avgMargin, avgPopularity * 100, simulatedItems)
                                    const topAdvice = advice[0]
                                    const classChanged = originalEditingItem && originalEditingItem.classification !== editingItem.classification
                                    const improvedClass = classChanged && (
                                        (editingItem.classification === 'STAR') ||
                                        (editingItem.classification === 'PLOWHORSE' && originalEditingItem?.classification === 'DOG') ||
                                        (editingItem.classification === 'PUZZLE' && originalEditingItem?.classification === 'DOG')
                                    )
                                    return (
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
                                    )
                                })()}

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
                                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-3 font-bold" onClick={() => setEditingItemId(null)}>
                                            Listo ✓
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </m.div>
                    )}
                </AnimatePresence>

                {selectedCategory && !isSimulationMode && (
                    <div className="absolute bottom-6 right-6 z-20">
                        <Button
                            size="lg"
                            variant="secondary"
                            className="glass-premium shadow-2xl rounded-full px-8 animate-in slide-in-from-bottom-4 duration-500 font-bold border border-white/20"
                            onClick={() => setSelectedCategory(null)}
                        >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Restablecer Vista
                        </Button>
                    </div>
                )}
            </div>

            <div className="w-full lg:w-[400px] shrink-0">
                <MenuAdvisor />
            </div>
        </div>
    )
}
