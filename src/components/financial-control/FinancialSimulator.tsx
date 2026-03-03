"use client"

import React, { useState, useEffect, useMemo } from "react"
import { m, AnimatePresence } from "framer-motion"
import {
    Target,
    TrendingUp,
    Users,
    ChefHat,
    DollarSign,
    Save,
    RotateCcw,
    X,
    Activity,
    BrainCircuit,
    ArrowUpRight,
    ArrowDownRight
} from "lucide-react"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell,
    ReferenceLine
} from "recharts"
import { createClient } from "@/lib/supabaseClient"
import { cn } from "@/lib/utils"
import { calculateFinancialProjection, MenuImpact } from "@/lib/financial-math"
import { EXPENSE_RATIOS } from "@/lib/financial-constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Tooltip } from "@/components/ui/Tooltip"

/**
 * FINANCIAL SIMULATOR (PRO VERSION)
 * --------------------------------
 * This component allows CEOs/CFOs to model different growth and efficiency scenarios.
 * It uses a standard multiplicative financial logic to calculate projected Net Profit.
 */

interface Scenario {
    id: string
    name: string
    adjustments: {
        priceIncrease: number
        volumeChange: number
        cogsReduction: number
        laborSavings: number
        fixedCostAdj: number
    }
}

interface MenuImpactExt extends MenuImpact {
    sourceName: string
    timestamp: string
    applied: boolean
}

interface FinancialSimulatorProps {
    restaurantId?: string
    financialData: {
        revenue: {
            dineIn: number
            takeout: number
            delivery: number
            total: number
        }
        totalExpenses: number
        netProfit: number
        netProfitMargin: number
    }
}

export default function FinancialSimulator({ restaurantId: propRestaurantId, financialData }: FinancialSimulatorProps) {
    const currentMetrics = useMemo(() => ({
        revenue: financialData.revenue.total,
        cogs: financialData.totalExpenses * EXPENSE_RATIOS.DEFAULT_COGS_PCT,
        labor: financialData.totalExpenses * EXPENSE_RATIOS.DEFAULT_LABOR_PCT,
        fixedCosts: financialData.totalExpenses * EXPENSE_RATIOS.DEFAULT_FIXED_PCT
    }), [financialData])
    const supabase = createClient()

    // 1. STATE MANAGEMENT
    const [effectiveRestaurantId, setEffectiveRestaurantId] = useState<string | undefined>(propRestaurantId)
    const [scenarios, setScenarios] = useState<Scenario[]>([])
    const [currentScenarioId, setCurrentScenarioId] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [newScenarioName, setNewScenarioName] = useState("")

    // Get restaurant ID if not provided
    useEffect(() => {
        if (propRestaurantId) {
            setEffectiveRestaurantId(propRestaurantId)
            return
        }

        async function getRestaurantId() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: restaurant } = await supabase
                    .from('restaurants')
                    .select('id')
                    .eq('owner_id', user.id)
                    .single()

                if (restaurant) {
                    setEffectiveRestaurantId(restaurant.id)
                }
            }
        }

        getRestaurantId()
    }, [propRestaurantId, supabase])

    // Levers (Adjustments)
    const [adjustments, setAdjustments] = useState({
        priceIncrease: 0,
        volumeChange: 0,
        cogsReduction: 0,
        laborSavings: 0,
        fixedCostAdj: 0
    })

    const [activeMenuImpact, setActiveMenuImpact] = useState<MenuImpactExt | null>(null)
    const [isMenuImpactApplied, setIsMenuImpactApplied] = useState(false)

    // 2. DATA FETCHING (Scenarios)
    useEffect(() => {
        async function loadScenarios() {
            if (!effectiveRestaurantId) return

            const { data, error } = await supabase
                .from('scenarios')
                .select('*')
                .eq('restaurant_id', effectiveRestaurantId)
                .order('created_at', { ascending: false })

            if (data && !error) {
                setScenarios(data)
            }
        }
        loadScenarios()

        // Check for Menu Impact in LocalStorage
        const checkMenuImpact = () => {
            const stored = localStorage.getItem('menu_simulation_impact')
            if (stored) {
                try {
                    const impact = JSON.parse(stored)
                    // If it's a new impact (different timestamp or not applied yet)
                    setActiveMenuImpact(impact)
                    setIsMenuImpactApplied(impact.applied || false)
                } catch (e) {
                    console.error("Error parsing menu impact", e)
                }
            }
        }

        checkMenuImpact()
        window.addEventListener('storage', checkMenuImpact)
        return () => window.removeEventListener('storage', checkMenuImpact)
    }, [effectiveRestaurantId, supabase])

    // 3. CALCULATION ENGINE
    const projection = useMemo(() => {
        return calculateFinancialProjection(
            {
                revenue: currentMetrics.revenue,
                cogs: currentMetrics.cogs,
                labor: currentMetrics.labor,
                fixedCosts: currentMetrics.fixedCosts
            },
            adjustments,
            isMenuImpactApplied ? activeMenuImpact || undefined : undefined
        )
    }, [currentMetrics, adjustments, activeMenuImpact, isMenuImpactApplied])

    // 4. HANDLERS
    const handleSaveScenario = async () => {
        if (!newScenarioName.trim()) {
            toast.error("Error", { description: "Ponle un nombre a tu escenario estratégico" })
            return
        }

        if (!effectiveRestaurantId) {
            toast.error("Error", { description: "No se pudo identificar el restaurante" })
            return
        }

        setIsSaving(true)
        try {
            const { data, error } = await supabase
                .from('scenarios')
                .upsert({
                    restaurant_id: effectiveRestaurantId,
                    name: newScenarioName,
                    adjustments: adjustments,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single()

            if (error) throw error

            setScenarios(prev => [data, ...prev.filter(s => s.id !== data.id)])
            setCurrentScenarioId(data.id)
            setNewScenarioName("")
            toast.success("Estrategia guardada", { description: "El escenario se ha almacenado correctamente." })
        } catch (error) {
            console.error(error)
            toast.error("Error", { description: "No se pudo guardar la simulación" })
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeleteScenario = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        const { error } = await supabase.from('scenarios').delete().eq('id', id)
        if (!error) {
            setScenarios(prev => prev.filter(s => s.id !== id))
            if (currentScenarioId === id) {
                setCurrentScenarioId(null)
                setAdjustments({ priceIncrease: 0, volumeChange: 0, cogsReduction: 0, laborSavings: 0, fixedCostAdj: 0 })
            }
        }
    }

    const loadScenario = (scenario: Scenario) => {
        setCurrentScenarioId(scenario.id)
        setAdjustments(scenario.adjustments)
        toast.info("Escenario cargado", { description: `Aplicando ajustes de: ${scenario.name}` })
    }

    const resetLevers = () => {
        setAdjustments({ priceIncrease: 0, volumeChange: 0, cogsReduction: 0, laborSavings: 0, fixedCostAdj: 0 })
        setCurrentScenarioId(null)
        setIsMenuImpactApplied(false)
    }

    const handleApplyMenuImpact = () => {
        setIsMenuImpactApplied(true)
        if (activeMenuImpact) {
            localStorage.setItem('menu_simulation_impact', JSON.stringify({ ...activeMenuImpact, applied: true }))
        }
        toast.success("Impacto de Menú aplicado", { description: "Los ajustes de la carta ahora influyen en el EBITDA." })
    }

    const handleDismissMenuImpact = () => {
        localStorage.removeItem('menu_simulation_impact')
        setActiveMenuImpact(null)
        setIsMenuImpactApplied(false)
    }

    // 5. RENDER HELPERS
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)

    const profitDelta = projection.projectedProfit - (currentMetrics.revenue - currentMetrics.cogs - currentMetrics.labor - currentMetrics.fixedCosts)

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-serif font-black flex items-center gap-3 tracking-tighter">
                        <BrainCircuit className="w-6 h-6 text-primary" />
                        Arquitecto de Beneficios
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium">
                        Simula decisiones estratégicas y visualiza su impacto en el EBITDA.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={resetLevers} className="rounded-full shadow-sm">
                        <RotateCcw className="w-3.5 h-3.5 mr-2" />
                        Resetear
                    </Button>
                    <div className="h-8 w-[1px] bg-neutral-200 mx-1" />
                    <Input
                        placeholder="Nombre de estrategia..."
                        value={newScenarioName}
                        onChange={(e) => setNewScenarioName(e.target.value)}
                        className="w-48 h-9 text-sm rounded-full bg-white/50 border-neutral-200"
                    />
                    <Button
                        size="sm"
                        onClick={handleSaveScenario}
                        disabled={isSaving}
                        className="rounded-full shadow-lg shadow-primary/20"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Guardar Escenario
                    </Button>
                </div>
            </header>

            {/* Menu Impact Notification */}
            <AnimatePresence>
                {activeMenuImpact && !isMenuImpactApplied && (
                    <m.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-200 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                <Activity className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-amber-900">
                                    Simulación detectada: <span className="underline decoration-amber-300 underline-offset-2">{activeMenuImpact.sourceName}</span>
                                </h4>
                                <p className="text-xs text-amber-700/70">
                                    Impacto proyectado: <span className="font-bold">{formatCurrency(activeMenuImpact.revenueDelta - activeMenuImpact.cogsDelta)}</span> adicionales en beneficio bruto.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={handleDismissMenuImpact} className="text-amber-700 hover:bg-amber-100 rounded-full">
                                <X className="w-4 h-4 mr-2" /> Descartar
                            </Button>
                            <Button size="sm" onClick={handleApplyMenuImpact} className="bg-amber-600 hover:bg-amber-700 text-white rounded-full">
                                <Activity className="w-4 h-4 mr-2" /> Aplicar a Proyección
                            </Button>
                        </div>
                    </m.div>
                )}
            </AnimatePresence>

            <div className="grid lg:grid-cols-12 gap-6">

                {/* LEFT COLLUMN: SIMULATION CONTROLS */}
                <div className="lg:col-span-4 space-y-6">

                    {/* LEVERS CARD */}
                    <div className="glass-card rounded-3xl p-6 border-white/20 shadow-xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Activity className="w-24 h-24" />
                        </div>

                        <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400 mb-6 flex items-center gap-2">
                            <Target className="w-3.5 h-3.5" />
                            Palancas de Valor
                        </h3>

                        <div className="space-y-6 relative z-10">
                            <Lever
                                label="Crecimiento Tráfico (Volumen)"
                                icon={Users}
                                value={adjustments.volumeChange}
                                onChange={(v) => setAdjustments(p => ({ ...p, volumeChange: v }))}
                                min={-20} max={100} suffix="%"
                                color="text-blue-600"
                                tooltip="Aumento proyectado en el número de comensales/pedidos."
                            />

                            <Lever
                                label="Optimización de Precios (Ticket)"
                                icon={DollarSign}
                                value={adjustments.priceIncrease}
                                onChange={(v) => setAdjustments(p => ({ ...p, priceIncrease: v }))}
                                min={-10} max={30} suffix="%"
                                color="text-violet-600"
                                tooltip="Incremento porcentual en los precios de carta."
                            />

                            <Lever
                                label="Eficiencia en COGS (Food Cost)"
                                icon={ChefHat}
                                value={adjustments.cogsReduction}
                                onChange={(v) => setAdjustments(p => ({ ...p, cogsReduction: v }))}
                                min={0} max={20} suffix="%"
                                color="text-emerald-600"
                                tooltip="Ahorro en coste de materia prima mediante ingeniería y compras."
                            />

                            <div className="pt-4 border-t border-black/5 space-y-2">
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                                    Ajuste de Costes Fijos
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-neutral-300">EUR</Badge>
                                </label>
                                <div className="flex items-center gap-3">
                                    <Input
                                        type="number"
                                        value={adjustments.fixedCostAdj}
                                        onChange={(e) => setAdjustments(p => ({ ...p, fixedCostAdj: Number(e.target.value) }))}
                                        className="h-10 font-mono text-center font-bold bg-white/40 rounded-xl"
                                    />
                                    <div className="text-[10px] text-neutral-400 leading-tight w-24">
                                        +/- Alquiler, nóminas extra, etc.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SAVED SCENARIOS */}
                    {scenarios.length > 0 && (
                        <div className="glass-card rounded-3xl p-5 border-white/10 bg-white/30 backdrop-blur-sm">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-4 px-1">Escenarios Guardados</h3>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                <AnimatePresence mode="popLayout">
                                    {scenarios.map((s) => (
                                        <m.div
                                            key={s.id}
                                            layout
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className={cn(
                                                "group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border",
                                                currentScenarioId === s.id
                                                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                                                    : "bg-white hover:bg-neutral-50 border-neutral-100 dark:bg-black/20"
                                            )}
                                            onClick={() => loadScenario(s)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Target className={cn("w-4 h-4", currentScenarioId === s.id ? "text-white" : "text-primary")} />
                                                <span className="text-sm font-bold truncate max-w-[140px]">{s.name}</span>
                                            </div>
                                            <button
                                                onClick={(e) => handleDeleteScenario(s.id, e)}
                                                title="Eliminar escenario"
                                                className={cn(
                                                    "p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity",
                                                    currentScenarioId === s.id ? "hover:bg-white/20 text-white" : "hover:bg-rose-50 text-rose-400"
                                                )}
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </m.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: ANALYTICS & RESULTS */}
                <div className="lg:col-span-8 space-y-6">

                    {/* PROFIT DELTA HEADER */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="glass-premium rounded-3xl p-6 border-none shadow-2xl bg-gradient-to-br from-neutral-900 to-neutral-800 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 scale-150">
                                <TrendingUp className="w-32 h-32" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-xs font-black uppercase tracking-widest text-white/50 mb-4">Beneficio Proyectado</p>
                                <div className="flex items-baseline gap-3">
                                    <h4 className="text-5xl font-serif font-black tracking-tighter">
                                        {formatCurrency(projection.projectedProfit)}
                                    </h4>
                                    <span className="text-sm font-bold text-white/60">/ mes</span>
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                    <div className={cn(
                                        "px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-lg",
                                        profitDelta >= 0 ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                                    )}>
                                        {profitDelta >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                                        {profitDelta >= 0 ? "+" : ""}{formatCurrency(profitDelta)}
                                    </div>
                                    <p className="text-xs text-white/40 font-medium italic">Impacto neto de la estrategia aplicada</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <SmallMetric
                                label="Ventas Proyectadas"
                                value={formatCurrency(projection.projectedRevenue)}
                                trend={((projection.projectedRevenue - currentMetrics.revenue) / currentMetrics.revenue) * 100}
                            />
                            <SmallMetric
                                label="Margen Bruto"
                                value={`${(projection.projectedMargin).toFixed(1)}%`}
                                trend={projection.projectedMargin - ((currentMetrics.revenue - currentMetrics.cogs - currentMetrics.labor - currentMetrics.fixedCosts) / currentMetrics.revenue * 100)}
                            />
                            <SmallMetric
                                label="Efficiency Gain"
                                value={formatCurrency(projection.impacts.efficiencyTotal)}
                                color="text-emerald-500"
                            />
                            <SmallMetric
                                label="Costes Totales"
                                value={formatCurrency(projection.projectedExpenses)}
                                invertTrend
                                trend={((projection.projectedExpenses - (currentMetrics.cogs + currentMetrics.labor + currentMetrics.fixedCosts)) / (currentMetrics.cogs + currentMetrics.labor + currentMetrics.fixedCosts)) * 100}
                            />
                        </div>
                    </div>

                    {/* CHART: WATERFALL PROFIT BRIDGE */}
                    <div className="glass-card rounded-3xl p-8 border-white/20 shadow-xl overflow-hidden min-h-[400px]">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h3 className="font-serif text-2xl font-black text-foreground tracking-tight">Puente Estratégico</h3>
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mt-1 opacity-60">Impacto Incremental por Palanca</p>
                            </div>
                            <Badge variant="outline" className="px-3 py-1 font-bold tracking-tighter bg-neutral-50 border-neutral-200">
                                DASHBOARD CEO
                            </Badge>
                        </div>

                        <div className="h-[280px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={projection.waterfallData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} stroke="#000" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }}
                                        dy={10}
                                    />
                                    <YAxis hide domain={['auto', 'auto']} />
                                    <RechartsTooltip
                                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload
                                                return (
                                                    <div className="glass-premium p-3 rounded-xl border-white/40 shadow-xl">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">{data.name}</p>
                                                        <p className={cn("text-lg font-mono font-black", data.value >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                                            {data.value >= 0 ? "+" : ""}{formatCurrency(data.value)}
                                                        </p>
                                                    </div>
                                                )
                                            }
                                            return null
                                        }}
                                    />
                                    <ReferenceLine y={0} stroke="#e2e8f0" strokeWidth={1} />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                                        {projection.waterfallData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.9} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-8 grid grid-cols-4 gap-4 px-4 pt-6 border-t border-black/5">
                            <WaterfallLegend color="#64748b" label="Real Actual" />
                            <WaterfallLegend color="#8b5cf6" label="Precio" />
                            <WaterfallLegend color="#3b82f6" label="Volumen" />
                            <WaterfallLegend color="#10b981" label="Eficiencia" />
                        </div>
                    </div>
                </div>
            </div>
        </div >
    )
}

// SUBCOMPONENTS
interface LeverProps {
    label: string
    icon: React.ElementType
    value: number
    onChange: (val: number) => void
    min: number
    max: number
    suffix: string
    color: string
    tooltip: string
}

function Lever({ label, icon: Icon, value, onChange, min, max, suffix, color, tooltip }: LeverProps) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-lg bg-neutral-100 dark:bg-black/20", color)}>
                        <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{label}</span>
                    <Tooltip content={tooltip} asIcon className="w-3 h-3 opacity-30" />
                </div>
                <span className={cn("font-mono font-black text-sm", color)}>
                    {value > 0 ? "+" : ""}{value}{suffix}
                </span>
            </div>
            <input
                type="range"
                title={label}
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-primary dark:bg-neutral-800"
            />
            <div className="flex justify-between text-[8px] font-black text-neutral-400 font-mono tracking-tighter uppercase">
                <span>Min: {min}{suffix}</span>
                <span>Max: {max}{suffix}</span>
            </div>
        </div>
    )
}

interface SmallMetricProps {
    label: string
    value: string
    trend?: number
    invertTrend?: boolean
    color?: string
}

function SmallMetric({ label, value, trend, invertTrend, color }: SmallMetricProps) {
    const isGood = trend !== undefined ? (invertTrend ? trend <= 0 : trend >= 0) : true
    return (
        <div className="glass-card rounded-2xl p-4 border-white/20 bg-white/40">
            <p className="text-[9px] font-black uppercase tracking-wider text-neutral-400 mb-1 truncate">{label}</p>
            <div className={cn("text-base font-serif font-black tracking-tight", color || "text-neutral-900 dark:text-white")}>
                {value}
            </div>
            {trend !== undefined && (
                <div className={cn("text-[10px] font-black flex items-center gap-0.5 mt-1", isGood ? "text-emerald-500" : "text-rose-500")}>
                    {trend > 0 ? "+" : ""}{trend.toFixed(1)}%
                </div>
            )}
        </div>
    )
}

function WaterfallLegend({ color, label }: { color: string, label: string }) {
    return (
        <div className="flex items-center gap-2">
            <div
                className="w-2.5 h-2.5 rounded-full dyn-bg"
                ref={(el) => { if (el) el.style.setProperty('--dyn-bg', color) }}
            />
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{label}</span>
        </div>
    )
}
