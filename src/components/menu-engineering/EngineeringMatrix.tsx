"use client"

import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Label, Cell, ReferenceArea } from "recharts"
import { m, AnimatePresence } from "framer-motion"
import React, { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { useMenuEngineering, SimulatedMenuItem } from "./MenuEngineeringContext"
import {
    RotateCcw, Save, Trash2, Sparkles, ChevronDown, Wand2,
    Calculator, Info, X, TrendingUp, TrendingDown, Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import MenuAdvisor from "./MenuAdvisor"
import { COLORS, quadrantConfig, getColor } from "./matrix/constants"
import type { ChartDataItem } from "./matrix/constants"
import { CustomTooltip, CustomDot } from "./matrix/MatrixChartElements"
import { ItemEditorPanel } from "./matrix/ItemEditorPanel"

interface EngineeringMatrixProps {
    items: SimulatedMenuItem[]
    avgPopularity: number
    avgMargin: number
}

export function EngineeringMatrix({ items, avgPopularity, avgMargin }: EngineeringMatrixProps) {
    const {
        hoveredCategory, selectedCategory, setSelectedCategory,
        isSimulationMode, setIsSimulationMode,
        originalItems, simulatedItems, updateSimulatedItem, resetSimulation,
        revenueDelta, cogsDelta,
        scenarios, currentScenarioId, saveScenario, loadScenario, deleteScenario, isSaving
    } = useMenuEngineering()

    const [newScenarioName, setNewScenarioName] = useState("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingItemId, setEditingItemId] = useState<string | null>(null)

    const editingItem = editingItemId ? simulatedItems.find(i => i.id === editingItemId) : null
    const originalEditingItem = editingItemId ? originalItems.find(i => i.id === editingItemId) : undefined

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

                {/* Header Controls */}
                <div className="flex justify-between items-start mb-2 z-10 relative">
                    <div>
                        <h3 className="font-serif text-3xl font-black text-foreground flex items-center gap-3 tracking-tighter">
                            Mapa Estratégico
                            {isSimulationMode && (
                                <Badge className="bg-amber-500 text-[10px] tracking-widest px-3 py-1 border-none shadow-lg shadow-amber-500/30 animate-pulse">
                                    SIMULACIÓN ACTIVA
                                </Badge>
                            )}
                        </h3>
                        <p className="text-sm font-medium text-muted-foreground mt-1 opacity-80 flex items-center gap-2">
                            Rentabilidad (Eje X) vs Popularidad (Eje Y)
                            <HoverCard>
                                <HoverCardTrigger asChild>
                                    <Info className="w-3 h-3 cursor-help text-muted-foreground/70" />
                                </HoverCardTrigger>
                                <HoverCardContent className="w-80 glass-premium border-white/20">
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-bold flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-amber-500" />
                                            Curso Rápido de Ingeniería
                                        </h4>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            El objetivo del juego es mover todos tus platos hacia la esquina <b>Superior Derecha (ESTRELLAS)</b>.
                                        </p>
                                        <div className="grid grid-cols-2 gap-2 text-[10px] uppercase font-bold tracking-wider">
                                            <div className="bg-emerald-500/10 text-emerald-600 p-2 rounded border border-emerald-500/20 text-center">
                                                ⬆️ Arriba = Más Popular
                                            </div>
                                            <div className="bg-emerald-500/10 text-emerald-600 p-2 rounded border border-emerald-500/20 text-center">
                                                ➡️ Derecha = Más Rentable
                                            </div>
                                        </div>
                                    </div>
                                </HoverCardContent>
                            </HoverCard>
                        </p>
                        <div className="grid grid-cols-4 gap-2 mt-2">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Estrellas
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                                <span className="w-2 h-2 rounded-full bg-amber-500" /> Vacas
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-600">
                                <span className="w-2 h-2 rounded-full bg-violet-500" /> Enigmas
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-600">
                                <span className="w-2 h-2 rounded-full bg-rose-500" /> Perros
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="bg-white/5 border-white/10 hover:bg-white/10 text-xs h-9">
                                    <Sparkles className="w-4 h-4 mr-2 text-amber-400" />
                                    {currentScenarioId ? scenarios.find(s => s.id === currentScenarioId)?.name : "Estrategias Guardadas"}
                                    <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56 glass-premium border-white/20">
                                <DropdownMenuLabel>Mis Escenarios</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {scenarios.map(s => (
                                    <DropdownMenuItem key={s.id} onClick={() => loadScenario(s.id)} className="flex items-center justify-between group">
                                        <span className="truncate">{s.name}</span>
                                        <Button
                                            variant="ghost" size="icon"
                                            className="h-6 w-6 text-muted-foreground group-hover:text-rose-400 transition-colors"
                                            onClick={(e) => { e.stopPropagation(); deleteScenario(s.id) }}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </DropdownMenuItem>
                                ))}
                                {scenarios.length === 0 && <DropdownMenuItem disabled>No hay escenarios</DropdownMenuItem>}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/10 h-9" disabled={!isSimulationMode || isSaving}>
                                    <Save className="w-4 h-4 mr-2" />
                                    Guardar
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="glass-premium border-white/20">
                                <DialogHeader>
                                    <DialogTitle>Guardar Estrategia</DialogTitle>
                                    <DialogDescription>Asigna un nombre a esta simulación para consultarla más tarde.</DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                    <Input
                                        placeholder="Ej: Menú Verano 2026..."
                                        value={newScenarioName}
                                        onChange={(e) => setNewScenarioName(e.target.value)}
                                        className="bg-white/5 border-white/10"
                                    />
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                    <Button onClick={handleSave} className="bg-amber-500 hover:bg-amber-600">Guardar Estrategia</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Button
                            id="simulation-toggle"
                            variant={isSimulationMode ? "default" : "outline"}
                            size="sm"
                            className={cn(
                                "h-9 border-white/10 transition-all duration-300",
                                isSimulationMode ? "bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20" : "bg-white/5 hover:bg-white/10"
                            )}
                            onClick={() => {
                                setIsSimulationMode(!isSimulationMode)
                                if (isSimulationMode) setEditingItemId(null)
                            }}
                        >
                            <Wand2 className="w-4 h-4 mr-2" />
                            {isSimulationMode ? "Ver Realidad" : "Simular Mejoras"}
                        </Button>
                    </div>
                </div>

                {/* Main Chart */}
                <div id="engineering-matrix-chart" className="flex-1 w-full min-h-[400px] relative z-0">
                    <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.05} stroke="#fff" />

                            <ReferenceArea x1={0} x2={avgMargin} y1={0} y2={avgPopularity * 100} fill={quadrantConfig.DOG.bg} />
                            <ReferenceArea x1={0} x2={avgMargin} y1={avgPopularity * 100} y2={yDomainMax} fill={quadrantConfig.PLOWHORSE.bg} />
                            <ReferenceArea x1={avgMargin} x2={xDomainMax} y1={0} y2={avgPopularity * 100} fill={quadrantConfig.PUZZLE.bg} />
                            <ReferenceArea x1={avgMargin} x2={xDomainMax} y1={avgPopularity * 100} y2={yDomainMax} fill={quadrantConfig.STAR.bg} />

                            <XAxis type="number" dataKey="x" name="Margen" unit="€" domain={[0, xDomainMax]}
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                axisLine={{ stroke: '#ffffff10', strokeWidth: 1 }}
                                tickLine={false} tickMargin={15}
                            >
                                <Label value="RENTABILIDAD (€ GANADO POR PLATO)" offset={-25} position="insideBottom" fill="#64748b" className="text-[10px] font-black uppercase tracking-[0.2em]" />
                            </XAxis>
                            <YAxis type="number" dataKey="y" name="Popularidad" unit="%" domain={[0, yDomainMax]}
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                axisLine={{ stroke: '#ffffff10', strokeWidth: 1 }}
                                tickLine={false} tickMargin={15}
                            >
                                <Label value="POPULARIDAD (CANTIDAD VENDIDA)" angle={-90} position="insideLeft" offset={0} fill="#64748b" className="text-[10px] font-black uppercase tracking-[0.2em]" />
                            </YAxis>

                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f59e0b', strokeWidth: 1.5, strokeDasharray: '6 6', opacity: 0.4 }} />

                            <ReferenceLine x={avgMargin} stroke="#ffffff40" strokeWidth={2} strokeDasharray="5 5" />
                            <ReferenceLine y={avgPopularity * 100} stroke="#ffffff40" strokeWidth={2} strokeDasharray="5 5" />

                            <ReferenceArea x1={avgMargin} x2={xDomainMax} y1={avgPopularity * 100} y2={yDomainMax} fill={COLORS.STAR} fillOpacity={0.03} label={{ value: 'ESTRELLAS', fill: COLORS.STAR, fontSize: 14, fontWeight: 900, opacity: 0.15, position: 'center' }} />
                            <ReferenceArea x1={0} x2={avgMargin} y1={avgPopularity * 100} y2={yDomainMax} fill={COLORS.PLOWHORSE} fillOpacity={0.03} label={{ value: 'VACAS', fill: COLORS.PLOWHORSE, fontSize: 14, fontWeight: 900, opacity: 0.15, position: 'center' }} />
                            <ReferenceArea x1={avgMargin} x2={xDomainMax} y1={0} y2={avgPopularity * 100} fill={COLORS.PUZZLE} fillOpacity={0.03} label={{ value: 'ENIGMAS', fill: COLORS.PUZZLE, fontSize: 14, fontWeight: 900, opacity: 0.15, position: 'center' }} />
                            <ReferenceArea x1={0} x2={avgMargin} y1={0} y2={avgPopularity * 100} fill={COLORS.DOG} fillOpacity={0.03} label={{ value: 'PERROS', fill: COLORS.DOG, fontSize: 14, fontWeight: 900, opacity: 0.15, position: 'center' }} />

                            {isSimulationMode && (
                                <g>
                                    {data.filter(d => d.hasMoved).map((d) => (
                                        <React.Fragment key={`trail-${d.id}`}>
                                            <ReferenceLine
                                                segment={[{ x: d.originalX, y: d.originalY }, { x: d.x, y: d.y }]}
                                                stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.4}
                                            />
                                            <Scatter
                                                data={[{ x: d.originalX, y: d.originalY }]}
                                                fill="transparent" shape="circle" stroke="#64748b"
                                                strokeDasharray="2 2" pointerEvents="none" opacity={0.3}
                                            />
                                        </React.Fragment>
                                    ))}
                                </g>
                            )}

                            <Scatter
                                name="Platos"
                                data={data}
                                shape={(props) => (
                                    <CustomDot
                                        {...props}
                                        hoveredCategory={hoveredCategory}
                                        selectedCategory={selectedCategory}
                                        isSimMode={isSimulationMode}
                                        editingId={editingItemId}
                                    />
                                )}
                                onClick={(dataItem) => {
                                    if (dataItem?.payload && isSimulationMode) {
                                        setEditingItemId(dataItem.payload.id)
                                    }
                                }}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={getColor(entry.classification)} />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>

                {/* Simulation: Initial Banner */}
                <AnimatePresence>
                    {isSimulationMode && !editingItem && simStats.itemsChanged === 0 && (
                        <m.div
                            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 24 }}
                            transition={{ type: "spring", damping: 20, stiffness: 300 }}
                            className="absolute bottom-6 left-6 right-6 z-20"
                        >
                            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl shadow-2xl shadow-amber-500/30 overflow-hidden">
                                <div className="px-4 lg:px-5 py-3 lg:py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-0">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 lg:p-2.5 bg-white/20 rounded-xl backdrop-blur-sm flex-shrink-0">
                                            <Wand2 className="w-4 h-4 lg:w-5 lg:h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs lg:text-sm font-bold">Modo Simulación</p>
                                            <p className="text-[10px] lg:text-[11px] opacity-90">Haz click en un gráfico para editar, o auto-optimiza</p>
                                        </div>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-white/60 hover:bg-white/20 hover:text-white lg:hidden ml-auto flex-shrink-0" onClick={() => setIsSimulationMode(false)}>
                                            <X className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-1 lg:gap-2 overflow-x-auto scrollbar-none pb-1 lg:pb-0">
                                        <Button size="sm" className="h-8 bg-white/20 hover:bg-white/30 text-white border-white/20 text-[10px] lg:text-[11px] font-bold backdrop-blur-sm whitespace-nowrap flex-shrink-0" onClick={autoOptimize}>
                                            <Zap className="w-3 h-3 lg:w-3.5 lg:h-3.5 mr-1 lg:mr-1.5" /> Auto-Optimizar
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-8 text-[10px] text-white/80 hover:bg-white/20 hover:text-white flex-shrink-0" onClick={resetSimulation}>
                                            <RotateCcw className="w-3 h-3 mr-1" /> Reset
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-white/60 hover:bg-white/20 hover:text-white hidden lg:flex flex-shrink-0" onClick={() => setIsSimulationMode(false)}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="px-5 pb-3 flex gap-1.5 overflow-x-auto scrollbar-none">
                                    {simulatedItems.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => setEditingItemId(item.id)}
                                            className={cn(
                                                "flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all",
                                                "bg-white/15 hover:bg-white/30 border border-white/20"
                                            )}
                                        >
                                            <span className={cn(
                                                "inline-block w-1.5 h-1.5 rounded-full mr-1.5",
                                                item.classification === 'STAR' && "bg-emerald-300",
                                                item.classification === 'PLOWHORSE' && "bg-amber-300",
                                                item.classification === 'PUZZLE' && "bg-violet-300",
                                                item.classification === 'DOG' && "bg-rose-300",
                                            )} />
                                            {item.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </m.div>
                    )}
                </AnimatePresence>

                {/* Simulation: KPI Dashboard */}
                <AnimatePresence>
                    {isSimulationMode && !editingItem && simStats.itemsChanged > 0 && (
                        <m.div
                            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
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

                {/* Simulation: Item Editor */}
                <AnimatePresence>
                    {isSimulationMode && editingItem && (
                        <ItemEditorPanel
                            editingItem={editingItem}
                            originalEditingItem={originalEditingItem}
                            avgMargin={avgMargin}
                            avgPopularity={avgPopularity}
                            simulatedItems={simulatedItems}
                            updateSimulatedItem={updateSimulatedItem}
                            onNavigate={navigateItem}
                            onClose={() => setEditingItemId(null)}
                        />
                    )}
                </AnimatePresence>

                {selectedCategory && !isSimulationMode && (
                    <div className="absolute bottom-6 right-6 z-20">
                        <Button
                            size="lg" variant="secondary"
                            className="glass-premium shadow-2xl rounded-full px-8 animate-in slide-in-from-bottom-4 duration-500 font-bold border border-white/20"
                            onClick={() => setSelectedCategory(null)}
                        >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Restablecer Vista
                        </Button>
                    </div>
                )}
            </div>

            <div id="menu-advisor" className="w-full lg:w-[400px] shrink-0">
                <MenuAdvisor />
            </div>
        </div>
    )
}
