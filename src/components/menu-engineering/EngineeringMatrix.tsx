"use client"

import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Label, Cell, ReferenceArea } from "recharts"
import { m, AnimatePresence } from "framer-motion"
import { Slider } from "@/components/ui/slider"
import React, { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { useMenuEngineering, SimulatedMenuItem } from "./MenuEngineeringContext"
import {
    RotateCcw, Save, Trash2, Sparkles, ChevronDown, Wand2,
    Calculator, Info, X, DollarSign, Scale, TrendingUp,
    TrendingDown, ArrowRight, Zap, ChevronLeft, ChevronRight,
    Lightbulb, BarChart3, Target, PartyPopper
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card"
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
import MenuAdvisor from "./MenuAdvisor"
import { MenuIntelligence } from "./menu-intelligence"

interface ChartDataItem {
    id: string
    name: string
    x: number
    y: number
    z: number
    classification?: 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG'
    originalX: number
    originalY: number
    hasMoved: boolean
}

interface EngineeringMatrixProps {
    items: SimulatedMenuItem[]
    avgPopularity: number
    avgMargin: number
}

const COLORS = {
    STAR: '#10b981',      // Emerald 500
    PLOWHORSE: '#f59e0b', // Amber 500
    PUZZLE: '#8b5cf6',    // Violet 500
    DOG: '#f43f5e',       // Rose 500
    DEFAULT: '#94a3b8'    // Slate 400
}

const quadrantConfig = {
    STAR: { label: "ESTRELLAS", color: COLORS.STAR, bg: "rgba(16, 185, 129, 0.05)" },
    PLOWHORSE: { label: "VACAS", color: COLORS.PLOWHORSE, bg: "rgba(245, 158, 11, 0.05)" },
    PUZZLE: { label: "ENIGMAS", color: COLORS.PUZZLE, bg: "rgba(139, 92, 246, 0.05)" },
    DOG: { label: "PERROS", color: COLORS.DOG, bg: "rgba(244, 63, 94, 0.05)" },
}

const CLASSIFICATION_LABELS: Record<string, string> = {
    STAR: 'Estrella',
    PLOWHORSE: 'Vaca',
    PUZZLE: 'Enigma',
    DOG: 'Perro'
}

const CustomTooltip = ({ active, payload }: { active?: boolean, payload?: Array<{ payload: ChartDataItem }> }) => {
    if (active && payload && payload.length) {
        const item = payload[0].payload
        return (
            <div className="glass-premium p-4 border border-white/20 shadow-2xl rounded-2xl animate-in zoom-in-95 duration-200 min-w-[200px]">
                <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-lg leading-tight">{item.name}</p>
                    <Badge className={cn(
                        "text-[10px] font-black uppercase px-1.5 py-0.5 border-none",
                        item.classification === 'STAR' && "bg-emerald-500/20 text-emerald-400",
                        item.classification === 'PLOWHORSE' && "bg-amber-500/20 text-amber-400",
                        item.classification === 'PUZZLE' && "bg-violet-500/20 text-violet-400",
                        item.classification === 'DOG' && "bg-rose-500/20 text-rose-400",
                    )}>
                        {item.classification === 'PLOWHORSE' ? 'VACA' : item.classification === 'PUZZLE' ? 'ENIGMA' : item.classification}
                    </Badge>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-white/10">
                    <div className="flex justify-between gap-8 text-xs">
                        <span className="text-white/40 uppercase tracking-wider font-bold">Margen</span>
                        <div className="flex flex-col items-end">
                            <span className="font-mono font-bold text-white">€{item.x.toFixed(2)}</span>
                            {item.hasMoved && (
                                <span className="text-[10px] text-white/50 line-through">€{item.originalX.toFixed(2)}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-between gap-8 text-xs">
                        <span className="text-white/40 uppercase tracking-wider font-bold">Ventas</span>
                        <span className="font-mono font-bold text-white">{item.z} ud.</span>
                    </div>
                </div>

                {item.hasMoved && (
                    <div className="mt-3 text-[10px] bg-amber-500/10 text-amber-400 p-2 rounded border border-amber-500/20 flex items-center gap-2">
                        <Calculator className="w-3 h-3" />
                        Simulación Activa
                    </div>
                )}
            </div>
        )
    }
    return null
}

interface DotProps {
    cx?: number
    cy?: number
    fill?: string
    payload?: ChartDataItem
    hoveredCategory?: string | null
    selectedCategory?: string | null
    isSimMode?: boolean
    editingId?: string | null
}

const CustomDot = (props: DotProps) => {
    const { cx, cy, fill, payload, hoveredCategory, selectedCategory, isSimMode, editingId } = props
    if (!cx || !cy || !payload) return null

    const isHovered = hoveredCategory === payload.classification
    const isSelected = selectedCategory === payload.classification
    const isDimmed = (hoveredCategory && !isHovered) || (selectedCategory && !isSelected)
    const isEditing = editingId === payload.id

    const size = isEditing ? 14 : (isHovered || isSelected ? 12 : 8)

    return (
        <g className="transition-all duration-300">
            {/* Simulation pulse ring — all dots pulse gently to show interactivity */}
            {isSimMode && !isDimmed && (
                <circle
                    cx={cx} cy={cy}
                    r={size + 6}
                    fill="none"
                    stroke={fill}
                    strokeWidth={1.5}
                    opacity={0.3}
                    className="animate-ping"
                />
            )}
            {/* Editing highlight ring */}
            {isEditing && (
                <>
                    <circle cx={cx} cy={cy} r={size + 8} fill={fill} fillOpacity={0.08} />
                    <circle cx={cx} cy={cy} r={size + 4} fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="3 3" className="animate-spin" />
                </>
            )}
            {/* Glow effect for Stars */}
            {payload.classification === 'STAR' && !isSimMode && (
                <circle cx={cx} cy={cy} r={size + 4} fill={fill} fillOpacity={0.2} className="animate-pulse" />
            )}
            <circle
                cx={cx}
                cy={cy}
                r={size}
                fill={fill}
                fillOpacity={isDimmed ? 0.1 : 1}
                stroke={isEditing ? "#f59e0b" : "white"}
                strokeWidth={isEditing ? 3 : (isHovered || isSelected ? 3 : 1.5)}
                className={cn(
                    "transition-all duration-300",
                    isSimMode ? "cursor-pointer" : "cursor-default"
                )}
            />
            {/* Name label for editing item */}
            {isEditing && (
                <text x={cx} y={cy - size - 10} textAnchor="middle" fill="#f59e0b" fontSize={10} fontWeight={800}>
                    {payload.name}
                </text>
            )}
        </g>
    )
}

// Quick action buttons for the inline editor
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

    // Prepare Chart Data
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

    // Scale Calculations
    const dataMaxX = Math.max(...data.map((d) => d.x), avgMargin * 1.5)
    const xDomainMax = Math.max(dataMaxX * 1.15, avgMargin * 1.5, 1)
    const dataMaxY = Math.max(...data.map((d) => d.y), avgPopularity * 100 * 1.5)
    const yDomainMax = Math.max(dataMaxY * 1.15, avgPopularity * 100 * 1.5, 1)

    // Simulation Impact Stats
    const simStats = useMemo(() => {
        const itemsChanged = data.filter(d => d.hasMoved).length
        const profitDelta = revenueDelta - cogsDelta
        return { itemsChanged, profitDelta }
    }, [data, revenueDelta, cogsDelta])

    const getColor = (classification?: string) => {
        switch (classification) {
            case 'STAR': return COLORS.STAR
            case 'PLOWHORSE': return COLORS.PLOWHORSE
            case 'PUZZLE': return COLORS.PUZZLE
            case 'DOG': return COLORS.DOG
            default: return COLORS.DEFAULT
        }
    }

    const handleSave = async () => {
        if (!newScenarioName) return
        await saveScenario(newScenarioName)
        setNewScenarioName("")
        setIsDialogOpen(false)
    }

    // Navigate between items in the editor
    const navigateItem = (direction: 'prev' | 'next') => {
        const currentIndex = simulatedItems.findIndex(i => i.id === editingItemId)
        if (currentIndex === -1) return
        const newIndex = direction === 'next'
            ? (currentIndex + 1) % simulatedItems.length
            : (currentIndex - 1 + simulatedItems.length) % simulatedItems.length
        setEditingItemId(simulatedItems[newIndex].id)
    }

    // Apply quick price/cost action
    const applyQuickAction = (field: 'price' | 'cost', factor: number) => {
        if (!editingItem) return
        const current = Number(editingItem[field])
        const newVal = Math.max(0, current * (1 + factor))
        updateSimulatedItem(editingItem.id, field, Math.round(newVal * 100) / 100)
    }

    // Auto-optimize: smart suggestions based on classification
    const autoOptimize = () => {
        simulatedItems.forEach(item => {
            const classification = item.classification
            const price = Number(item.price)
            const cost = Number(item.cost)
            const foodCost = cost / price

            if (classification === 'DOG') {
                // Dogs: raise price 8%, reduce cost 5%
                updateSimulatedItem(item.id, 'price', Math.round(price * 1.08 * 100) / 100)
                updateSimulatedItem(item.id, 'cost', Math.round(cost * 0.95 * 100) / 100)
            } else if (classification === 'PLOWHORSE') {
                // Plowhorses: raise price 5% to improve margin
                updateSimulatedItem(item.id, 'price', Math.round(price * 1.05 * 100) / 100)
            } else if (classification === 'PUZZLE') {
                // Puzzles: reduce cost 5% to improve margin & value perception
                updateSimulatedItem(item.id, 'cost', Math.round(cost * 0.95 * 100) / 100)
            } else if (classification === 'STAR' && foodCost > 0.30) {
                // Stars with high food cost: slim cost 3%
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
                {/* Simulation Scanline Effect */}
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
                        {/* Quadrant Legend */}
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
                        {/* Scenario Selector */}
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
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground group-hover:text-rose-400 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                deleteScenario(s.id)
                                            }}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </DropdownMenuItem>
                                ))}
                                {scenarios.length === 0 && <DropdownMenuItem disabled>No hay escenarios</DropdownMenuItem>}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Save Trigger */}
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

                {/* Main Chart Area */}
                <div className="flex-1 w-full min-h-[400px] relative z-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.05} stroke="#fff" />

                            {/* Quadrant Backgrounds */}
                            <ReferenceArea x1={0} x2={avgMargin} y1={0} y2={avgPopularity * 100} fill={quadrantConfig.DOG.bg} />
                            <ReferenceArea x1={0} x2={avgMargin} y1={avgPopularity * 100} y2={yDomainMax} fill={quadrantConfig.PLOWHORSE.bg} />
                            <ReferenceArea x1={avgMargin} x2={xDomainMax} y1={0} y2={avgPopularity * 100} fill={quadrantConfig.PUZZLE.bg} />
                            <ReferenceArea x1={avgMargin} x2={xDomainMax} y1={avgPopularity * 100} y2={yDomainMax} fill={quadrantConfig.STAR.bg} />

                            <XAxis type="number" dataKey="x" name="Margen" unit="€" domain={[0, xDomainMax]}
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                axisLine={{ stroke: '#ffffff10', strokeWidth: 1 }}
                                tickLine={false}
                                tickMargin={15}
                            >
                                <Label value="RENTABILIDAD (€ GANADO POR PLATO)" offset={-25} position="insideBottom" fill="#64748b" className="text-[10px] font-black uppercase tracking-[0.2em]" />
                            </XAxis>
                            <YAxis type="number" dataKey="y" name="Popularidad" unit="%" domain={[0, yDomainMax]}
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                axisLine={{ stroke: '#ffffff10', strokeWidth: 1 }}
                                tickLine={false}
                                tickMargin={15}
                            >
                                <Label value="POPULARIDAD (CANTIDAD VENDIDA)" angle={-90} position="insideLeft" offset={0} fill="#64748b" className="text-[10px] font-black uppercase tracking-[0.2em]" />
                            </YAxis>

                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f59e0b', strokeWidth: 1.5, strokeDasharray: '6 6', opacity: 0.4 }} />

                            {/* Center Intersect Lines */}
                            <ReferenceLine x={avgMargin} stroke="#ffffff40" strokeWidth={2} strokeDasharray="5 5" />
                            <ReferenceLine y={avgPopularity * 100} stroke="#ffffff40" strokeWidth={2} strokeDasharray="5 5" />

                            {/* Quadrant Areas */}
                            <ReferenceArea x1={avgMargin} x2={xDomainMax} y1={avgPopularity * 100} y2={yDomainMax} fill={COLORS.STAR} fillOpacity={0.03} label={{ value: 'ESTRELLAS', fill: COLORS.STAR, fontSize: 14, fontWeight: 900, opacity: 0.15, position: 'center' }} />
                            <ReferenceArea x1={0} x2={avgMargin} y1={avgPopularity * 100} y2={yDomainMax} fill={COLORS.PLOWHORSE} fillOpacity={0.03} label={{ value: 'VACAS', fill: COLORS.PLOWHORSE, fontSize: 14, fontWeight: 900, opacity: 0.15, position: 'center' }} />
                            <ReferenceArea x1={avgMargin} x2={xDomainMax} y1={0} y2={avgPopularity * 100} fill={COLORS.PUZZLE} fillOpacity={0.03} label={{ value: 'ENIGMAS', fill: COLORS.PUZZLE, fontSize: 14, fontWeight: 900, opacity: 0.15, position: 'center' }} />
                            <ReferenceArea x1={0} x2={avgMargin} y1={0} y2={avgPopularity * 100} fill={COLORS.DOG} fillOpacity={0.03} label={{ value: 'PERROS', fill: COLORS.DOG, fontSize: 14, fontWeight: 900, opacity: 0.15, position: 'center' }} />

                            {/* Movement Trails (Ghosts of past positions) */}
                            {isSimulationMode && (
                                <g>
                                    {data.filter(d => d.hasMoved).map((d) => (
                                        <React.Fragment key={`trail-${d.id}`}>
                                            <ReferenceLine
                                                segment={[{ x: d.originalX, y: d.originalY }, { x: d.x, y: d.y }]}
                                                stroke="#f59e0b"
                                                strokeWidth={1.5}
                                                strokeDasharray="4 4"
                                                opacity={0.4}
                                            />
                                            <Scatter
                                                data={[{ x: d.originalX, y: d.originalY }]}
                                                fill="transparent"
                                                shape="circle"
                                                stroke="#64748b"
                                                strokeDasharray="2 2"
                                                pointerEvents="none"
                                                opacity={0.3}
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

                {/* ═══════════════════ SIMULATION OVERLAYS ═══════════════════ */}

                {/* 1. Initial Banner — shown when simulation active but no item selected */}
                <AnimatePresence>
                    {isSimulationMode && !editingItem && simStats.itemsChanged === 0 && (
                        <m.div
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 24 }}
                            transition={{ type: "spring", damping: 20, stiffness: 300 }}
                            className="absolute bottom-6 left-6 right-6 z-20"
                        >
                            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl shadow-2xl shadow-amber-500/30 overflow-hidden">
                                <div className="px-5 py-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                                            <Wand2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">Modo Simulación</p>
                                            <p className="text-[11px] opacity-90">Haz click en un punto del gráfico para editar, o auto-optimiza todo</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            className="h-8 bg-white/20 hover:bg-white/30 text-white border-white/20 text-[11px] font-bold backdrop-blur-sm"
                                            onClick={autoOptimize}
                                        >
                                            <Zap className="w-3.5 h-3.5 mr-1.5" /> Auto-Optimizar
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-8 text-[10px] text-white/80 hover:bg-white/20 hover:text-white" onClick={resetSimulation}>
                                            <RotateCcw className="w-3 h-3 mr-1" /> Reset
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-white/60 hover:bg-white/20 hover:text-white" onClick={() => setIsSimulationMode(false)}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Item Quick-Select Row */}
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

                {/* 2. Floating KPI Dashboard — shown when items have been changed */}
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
                                {/* KPI Row */}
                                <div className="grid grid-cols-5 divide-x divide-black/5 dark:divide-white/5">
                                    <div className="p-3 text-center">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Platos Tocados</p>
                                        <p className="text-lg font-black text-amber-600 font-mono">{simStats.itemsChanged}</p>
                                    </div>
                                    <div className="p-3 text-center">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Δ Ingresos</p>
                                        <p className={cn("text-lg font-black font-mono flex items-center justify-center gap-1", revenueDelta >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                            {revenueDelta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                            {revenueDelta >= 0 ? "+" : ""}€{Math.abs(revenueDelta).toFixed(0)}
                                        </p>
                                    </div>
                                    <div className="p-3 text-center">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Δ Beneficio</p>
                                        <p className={cn("text-lg font-black font-mono flex items-center justify-center gap-1", simStats.profitDelta >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                            {simStats.profitDelta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                            {simStats.profitDelta >= 0 ? "+" : ""}€{Math.abs(simStats.profitDelta).toFixed(0)}
                                        </p>
                                    </div>
                                    <div className="p-3 text-center">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Δ Costes</p>
                                        <p className={cn("text-lg font-black font-mono flex items-center justify-center gap-1", cogsDelta <= 0 ? "text-emerald-600" : "text-rose-600")}>
                                            {cogsDelta <= 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                                            {cogsDelta > 0 ? "+" : ""}€{Math.abs(cogsDelta).toFixed(0)}
                                        </p>
                                    </div>
                                    <div className="p-3 text-center bg-emerald-50/50 dark:bg-emerald-500/5">
                                        <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Impacto Mensual</p>
                                        <p className={cn("text-lg font-black font-mono flex items-center justify-center gap-1", simStats.profitDelta >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                            {simStats.profitDelta >= 0 ? "+" : ""}€{Math.abs(simStats.profitDelta * 30).toFixed(0)}
                                        </p>
                                    </div>
                                </div>

                                {/* Action Bar */}
                                <div className="px-4 py-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02]">
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setEditingItemId(simulatedItems[0]?.id || null)}>
                                            <Calculator className="w-3 h-3 mr-1" /> Editar Platos
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={autoOptimize}>
                                            <Zap className="w-3 h-3 mr-1" /> Re-Optimizar
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-2">
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

                {/* 3. Enhanced Inline Editor Panel */}
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
                                {/* Editor Header */}
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
                                                    {/* Classification change indicator */}
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

                                {/* Editor Body */}
                                <div className="px-4 py-3 grid grid-cols-2 gap-5">
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
                                        {/* Quick Action Chips */}
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
                                        {/* Quick Action Chips */}
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
                                            {/* Celebration banner when class improves */}
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
                                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-3 font-bold" onClick={() => setEditingItemId(null)}>
                                            Listo ✓
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </m.div>
                    )}
                </AnimatePresence>

                {/* Reset View Button */}
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

            {/* Menu Advisor Column */}
            <div className="w-full lg:w-[400px] shrink-0">
                <MenuAdvisor />
            </div>
        </div>
    )
}
