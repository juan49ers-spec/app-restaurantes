"use client"

import { useState, useMemo } from "react"
import { m, AnimatePresence } from "framer-motion"
import {
    Target,
    DollarSign,
    Users,
    ChefHat,
    Sparkles,
    CheckCircle2
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
import { cn } from "@/lib/utils"
import { calculateFinancialProjection } from "@/lib/financial-math"
// import { Slider } from "@/components/ui/slider" // Assuming we have or will create a custom slider
// import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// import { Badge } from "@/components/ui/badge"

interface StrategicProfitSimulatorProps {
    currentMetrics: {
        revenue: number
        cogs: number
        labor: number
        fixedCosts: number // rent, utilities, etc.
        netProfit: number
        netMarginPct: number
        averageTicket: number
        totalCovers: number
    }
}

export function StrategicProfitSimulator({ currentMetrics }: StrategicProfitSimulatorProps) {
    // State for the goal
    const [targetProfit, setTargetProfit] = useState<number>(currentMetrics.netProfit * 1.2) // Default +20%
    // const [isSimulating, setIsSimulating] = useState(false) // Reserved for future loading states

    // Simulation Levers (Percentage changes)
    const [levers, setLevers] = useState({
        volume: 0,      // % increase in traffic
        price: 0,       // % increase in avg ticket
        efficiency: 0   // % reduction in COGS
    })

    // Unified Calculation Engine
    const simulationResults = useMemo(() => {
        return calculateFinancialProjection(
            {
                revenue: currentMetrics.revenue,
                cogs: currentMetrics.cogs,
                labor: currentMetrics.labor,
                fixedCosts: currentMetrics.fixedCosts
            },
            {
                priceIncrease: levers.price,
                volumeChange: levers.volume,
                cogsReduction: levers.efficiency,
                laborSavings: 0, // Strategic Sim simplistic view doesn't have labor lever yet
                fixedCostAdj: 0  // Strategic Sim doesn't have fixed cost lever yet
            }
        )
    }, [currentMetrics, levers])

    const { projectedProfit: simulatedProfit, waterfallData } = simulationResults
    const profitGap = targetProfit - simulatedProfit

    // Formatting helper
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(val)

    // AI Suggestions
    const suggestions = useMemo(() => {
        const s = []
        if (profitGap > 0) {
            // Need more profit
            const ticketIncreaseNeeded = (profitGap / currentMetrics.totalCovers).toFixed(2)
            s.push({
                icon: DollarSign,
                title: "Optimización de Precios",
                desc: `Subir el ticket medio en +${ticketIncreaseNeeded}€ cubriría la brecha actual.`,
                impact: "Alto",
                color: "text-violet-500 bg-violet-500/10"
            })

            const volumeNeeded = Math.ceil(profitGap / (currentMetrics.averageTicket - (currentMetrics.cogs / currentMetrics.totalCovers)))
            s.push({
                icon: Users,
                title: "Captación de Tráfico",
                desc: `Necesitas ${volumeNeeded} clientes extra al mes con el margen actual.`,
                impact: "Medio",
                color: "text-blue-500 bg-blue-500/10"
            })
        } else {
            s.push({
                icon: CheckCircle2,
                title: "Objetivo Alcanzable",
                desc: "Con la configuración actual superas tu meta estratégica.",
                impact: "Positivo",
                color: "text-emerald-500 bg-emerald-500/10"
            })
        }
        return s
    }, [profitGap, currentMetrics])

    return (
        <div className="space-y-8 p-6 glass-card rounded-3xl border border-white/20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-serif font-bold flex items-center gap-3">
                        <Target className="w-6 h-6 text-primary" />
                        Simulador Estratégico de Beneficios
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Diseña tu ruta hacia la rentabilidad objetivo.
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-white/50 dark:bg-black/20 p-2 rounded-xl border border-white/10">
                    <div className="text-right px-2">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Beneficio Objetivo</span>
                        <div className="flex items-baseline gap-1 justify-end">
                            <span className="font-mono text-xl font-bold text-primary">{formatCurrency(targetProfit)}</span>
                            <span className="text-xs text-muted-foreground">/mes</span>
                        </div>
                    </div>
                    {/* Simple Input for Target (could be a sophisticated slider later) */}
                    <Input
                        type="number"
                        aria-label="Beneficio Objetivo"
                        value={targetProfit}
                        onChange={(e) => setTargetProfit(Number(e.target.value))}
                        className="w-32 text-right font-mono font-bold bg-white/50 border-black/10 focus:ring-primary h-12 text-lg"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visualizer (2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Progress Bar / Metric Header */}
                    <div className="grid grid-cols-3 gap-4">
                        <MetricCard label="Beneficio Actual" value={currentMetrics.netProfit} format={formatCurrency} />
                        <MetricCard
                            label="Beneficio Simulado"
                            value={simulatedProfit}
                            format={formatCurrency}
                            highlight={true}
                            trend={((simulatedProfit - currentMetrics.netProfit) / currentMetrics.netProfit) * 100}
                        />
                        <MetricCard
                            label="Brecha (Gap)"
                            value={profitGap * -1}
                            format={formatCurrency}
                            color={profitGap > 0 ? "text-rose-500" : "text-emerald-500"}
                            subLabel={profitGap > 0 ? "Faltante" : "Superávit"}
                        />
                    </div>

                    {/* Waterfall Chart */}
                    <div className="h-[300px] w-full bg-white/40 dark:bg-black/20 rounded-2xl p-4 border border-white/10 relative">
                        <h4 className="absolute top-4 left-4 text-xs font-bold uppercase tracking-widest opacity-50">Puente de Rentabilidad</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={waterfallData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, opacity: 0.7 }} />
                                <YAxis hide />
                                <RechartsTooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(val: number | string | Array<number | string> | undefined) => formatCurrency(Number(val || 0))}
                                />
                                <ReferenceLine y={targetProfit} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Meta', position: 'right', fill: '#10b981', fontSize: 10 }} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {waterfallData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Controls & AI (1/3) */}
                <div className="space-y-6">
                    {/* Levers */}
                    <div className="bg-white/60 dark:bg-black/40 rounded-2xl p-5 border border-white/10 space-y-6">
                        <h3 className="font-serif font-bold text-lg">Palancas de Crecimiento</h3>

                        <LeverControl
                            label="Volumen de Ventas"
                            icon={Users}
                            value={levers.volume}
                            onChange={(v) => setLevers(p => ({ ...p, volume: v }))}
                            suffix="%"
                            min={-20}
                            max={50}
                        />

                        <LeverControl
                            label="Precio Medio (Ticket)"
                            icon={DollarSign}
                            value={levers.price}
                            onChange={(v) => setLevers(p => ({ ...p, price: v }))}
                            suffix="%"
                            min={-10}
                            max={30}
                        />

                        <LeverControl
                            label="Eficiencia (Red. Costes)"
                            icon={ChefHat}
                            value={levers.efficiency}
                            onChange={(v) => setLevers(p => ({ ...p, efficiency: v }))}
                            suffix="%"
                            min={0}
                            max={15}
                            color="text-emerald-500"
                        />
                    </div>

                    {/* AI Advisor - "God Mode" Insights */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Asesor Estratégico IA</span>
                        </div>

                        <AnimatePresence>
                            {suggestions.map((s, i) => (
                                <m.div
                                    key={i}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className={cn("p-4 rounded-xl border border-black/5 flex gap-3", s.color)}
                                >
                                    <div className="mt-1 bg-white/50 p-1.5 rounded-lg">
                                        <s.icon className="w-4 h-4 opacity-80" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm leading-tight">{s.title}</h4>
                                        <p className="text-xs opacity-80 mt-1 leading-snug">{s.desc}</p>
                                    </div>
                                </m.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    )
}

interface MetricCardProps {
    label: string
    value: number
    format: (val: number) => string
    highlight?: boolean
    trend?: number
    color?: string
    subLabel?: string
}

// Subcomponents for cleaner code
function MetricCard({ label, value, format, highlight, trend, color, subLabel }: MetricCardProps) {
    return (
        <div className={cn(
            "p-4 rounded-2xl border",
            highlight ? "bg-primary/5 border-primary/20" : "bg-white/40 border-white/10 dark:bg-white/5"
        )}>
            <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">{label}</div>
            <div className={cn("text-2xl font-mono font-black tracking-tight", color || "text-foreground")}>
                {format(value)}
            </div>
            {trend !== undefined && (
                <div className={cn("text-xs font-bold mt-1", trend >= 0 ? "text-emerald-500" : "text-rose-500")}>
                    {trend > 0 ? "+" : ""}{trend.toFixed(1)}%
                </div>
            )}
            {subLabel && (
                <div className="text-xs font-medium text-muted-foreground mt-1 opacity-80">{subLabel}</div>
            )}
        </div>
    )
}

interface LeverControlProps {
    label: string
    icon: React.ElementType
    value: number
    onChange: (val: number) => void
    suffix: string
    min: number
    max: number
    color?: string
}

function LeverControl({ label, icon: Icon, value, onChange, suffix, min, max, color }: LeverControlProps) {
    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center text-sm font-medium">
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span>{label}</span>
                </div>
                <span className={cn("font-mono font-bold", color || "text-primary")}>
                    {value > 0 ? "+" : ""}{value}{suffix}
                </span>
            </div>
            {/* Custom Range Slider using basic input for now, replacing with Radix Slider recommended */}
            <input
                type="range"
                aria-label={label}
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>{min}{suffix}</span>
                <span>{max}{suffix}</span>
            </div>
        </div>
    )
}
