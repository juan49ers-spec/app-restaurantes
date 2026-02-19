"use client"

import { useMenuEngineering } from "./MenuEngineeringContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
    ChefHat, DollarSign, Scale, RotateCcw, Calculator,
    Lightbulb, Brain, Star, AlertTriangle, Beef,
    Target, Zap, Sparkles, ArrowRight
} from "lucide-react"
import { useState, useMemo } from "react"
import { MenuIntelligence, MenuAdvice } from "./menu-intelligence"
import { cn } from "@/lib/utils"

/* ═══════════════════════════════════════════
   Classification Config
   ═══════════════════════════════════════════ */
const CLS: Record<string, {
    label: string; emoji: string; icon: React.ElementType
    gradient: string; lightBg: string; textColor: string
}> = {
    STAR: {
        label: 'Estrella', emoji: '★', icon: Star,
        gradient: 'from-emerald-500 to-emerald-600',
        lightBg: 'bg-emerald-50 dark:bg-emerald-500/10',
        textColor: 'text-emerald-600 dark:text-emerald-400',
    },
    PLOWHORSE: {
        label: 'Vaca', emoji: '🐄', icon: Beef,
        gradient: 'from-amber-500 to-amber-600',
        lightBg: 'bg-amber-50 dark:bg-amber-500/10',
        textColor: 'text-amber-600 dark:text-amber-400',
    },
    PUZZLE: {
        label: 'Enigma', emoji: '🔮', icon: Brain,
        gradient: 'from-violet-500 to-violet-600',
        lightBg: 'bg-violet-50 dark:bg-violet-500/10',
        textColor: 'text-violet-600 dark:text-violet-400',
    },
    DOG: {
        label: 'Perro', emoji: '⚠️', icon: AlertTriangle,
        gradient: 'from-rose-500 to-rose-600',
        lightBg: 'bg-rose-50 dark:bg-rose-500/10',
        textColor: 'text-rose-600 dark:text-rose-400',
    },
}

/* ═══════════════════════════════════════════
   Metric Tile — small KPI block
   ═══════════════════════════════════════════ */
function MetricTile({ label, value, sub, accent }: {
    label: string; value: string; sub?: string; accent?: string
}) {
    return (
        <div className="flex flex-col">
            <span className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wide">{label}</span>
            <span className={cn("text-base font-black font-mono tracking-tight", accent || "text-foreground")}>{value}</span>
            {sub && <span className="text-[9px] text-muted-foreground font-medium">{sub}</span>}
        </div>
    )
}

/* ═══════════════════════════════════════════
   Ring Gauge — SVG donut for Food Cost
   ═══════════════════════════════════════════ */
function RingGauge({ value, color }: { value: number; color: string }) {
    const r = 28
    const c = 2 * Math.PI * r
    const pct = Math.min(value / 60, 1) // 60% max for visual
    const offset = c * (1 - pct)

    return (
        <div className="relative w-[72px] h-[72px] flex items-center justify-center">
            <svg width="72" height="72" className="-rotate-90">
                <circle cx="36" cy="36" r={r} fill="none" strokeWidth="5"
                    className="stroke-black/[0.04] dark:stroke-white/[0.06]" />
                <circle cx="36" cy="36" r={r} fill="none" strokeWidth="5"
                    stroke={color} strokeLinecap="round"
                    strokeDasharray={c} strokeDashoffset={offset}
                    className="transition-all duration-700 ease-out" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[15px] font-black font-mono" style={{ color }}>
                    {value.toFixed(1)}
                </span>
                <span className="text-[8px] font-bold text-muted-foreground">%FC</span>
            </div>
        </div>
    )
}

/* ═══════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════ */
export default function AIChefLab() {
    const {
        simulatedItems, updateSimulatedItem, resetSimulation,
        isSimulationMode, setIsSimulationMode
    } = useMenuEngineering()

    const [selectedItemId, setSelectedItemId] = useState<string>("")

    const selectedItem = useMemo(() =>
        simulatedItems.find(i => i.id === selectedItemId) || simulatedItems[0],
        [simulatedItems, selectedItemId]
    )

    const aiAdvice = useMemo(() => {
        if (!selectedItem) return []
        const avgM = simulatedItems.reduce((s, i) => s + Number(i.contribution_margin), 0) / (simulatedItems.length || 1)
        const avgP = simulatedItems.reduce((s, i) => s + Number(i.quantity_sold), 0) / (simulatedItems.length || 1)
        return MenuIntelligence.analyzeItem(selectedItem, avgM, avgP, simulatedItems)
    }, [selectedItem, simulatedItems])

    const simResult = useMemo(() => {
        if (!selectedItem) return null

        // Calculate Category Avg Price for Anchor Effect
        const categoryItems = simulatedItems.filter(i => i.category === selectedItem.category)
        const avgCatPrice = categoryItems.length > 0
            ? categoryItems.reduce((acc, i) => acc + Number(i.price), 0) / categoryItems.length
            : 0

        return MenuIntelligence.simulatePriceChange(selectedItem, Number(selectedItem.price), avgCatPrice)
    }, [selectedItem, simulatedItems])

    const pairing = useMemo(() => {
        if (!selectedItem || selectedItem.classification !== 'DOG') return null
        return MenuIntelligence.suggestPairing(selectedItem, simulatedItems)
    }, [selectedItem, simulatedItems])

    const setPrice = (v: number) => { if (selectedItem) updateSimulatedItem(selectedItem.id, 'price', v) }
    const setCost = (v: number) => { if (selectedItem) updateSimulatedItem(selectedItem.id, 'cost', v) }
    const nudge = (field: 'price' | 'cost', factor: number) => {
        if (!selectedItem) return
        const cur = Number(field === 'price' ? selectedItem.price : selectedItem.cost)
        const nv = Math.round(cur * factor * 100) / 100
        field === 'price' ? setPrice(nv) : setCost(nv)
    }

    // KPIs
    const p = Number(selectedItem?.price || 0)
    const c = Number(selectedItem?.cost || 0)
    const margin = p - c
    const fc = p > 0 ? (c / p) * 100 : 0
    const qty = Number(selectedItem?.quantity_sold || 0)
    const dailyProfit = margin * qty
    const monthlyProfit = dailyProfit * 30
    const cls = selectedItem?.classification || 'DOG'
    const cfg = CLS[cls]
    const fcColor = fc > 40 ? '#ef4444' : fc > 35 ? '#f59e0b' : '#10b981'

    /* ─── Inactive ─── */
    if (!isSimulationMode) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center px-8 py-12 border-2 border-dashed border-muted/40 rounded-2xl">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center mb-4">
                    <ChefHat className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-base font-bold">Consultor Chef IA</h3>
                <p className="text-xs text-muted-foreground max-w-[260px] mt-1.5 mb-5 leading-relaxed">
                    Simula cambios de precio y coste, recibe recomendaciones inteligentes y proyecta el impacto financiero.
                </p>
                <Button onClick={() => setIsSimulationMode(true)}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg shadow-amber-500/20 rounded-xl h-10 px-5">
                    <Calculator className="w-4 h-4 mr-2" /> Activar Simulador
                </Button>
            </div>
        )
    }

    /* ─── Active ─── */
    return (
        <div className="h-full flex flex-col gap-3 overflow-y-auto custom-scrollbar pb-4 pr-1">

            {/* ━━━ ITEM SELECTOR ━━━ */}
            <div className="flex items-center gap-2">
                <select
                    title="Seleccionar plato"
                    className="flex-1 h-9 rounded-xl bg-white dark:bg-neutral-800 border border-black/8 dark:border-white/8 
                               px-3 text-sm font-medium shadow-sm transition-all
                               focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                    value={selectedItemId || ""}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                >
                    {simulatedItems.map(item => {
                        const cc = CLS[item.classification || 'DOG']
                        return (
                            <option key={item.id} value={item.id}>
                                {cc.emoji} {item.recipe?.name}
                            </option>
                        )
                    })}
                </select>
                <Button variant="ghost" size="icon" onClick={resetSimulation}
                    className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground shrink-0">
                    <RotateCcw className="w-3.5 h-3.5" />
                </Button>
            </div>

            {selectedItem && (
                <>
                    {/* ━━━ ITEM HERO CARD ━━━ */}
                    <div className="rounded-2xl overflow-hidden shadow-md border border-white/40 dark:border-white/5">
                        {/* Gradient classification strip */}
                        <div className={cn("h-1.5 bg-gradient-to-r", cfg.gradient)} />

                        <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm p-4">
                            {/* Name + Classification */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-bold text-foreground truncate">
                                        {selectedItem.recipe?.name}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge className={cn("text-[9px] font-bold px-2 h-5 border-none", cfg.lightBg, cfg.textColor)}>
                                            {cfg.emoji} {cfg.label}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground font-mono">{qty} uds/día</span>
                                    </div>
                                </div>
                                <RingGauge value={fc} color={fcColor} />
                            </div>

                            {/* KPI Row */}
                            <div className="grid grid-cols-4 gap-2 pt-3 border-t border-black/5 dark:border-white/5">
                                <MetricTile label="Precio" value={`€${p.toFixed(2)}`} />
                                <MetricTile label="Coste" value={`€${c.toFixed(2)}`} />
                                <MetricTile label="Margen"
                                    value={`€${margin.toFixed(2)}`}
                                    accent={margin > 0 ? "text-emerald-600" : "text-rose-600"} />
                                <MetricTile label="€/Mes"
                                    value={`€${monthlyProfit >= 1000 ? (monthlyProfit / 1000).toFixed(1) + 'k' : monthlyProfit.toFixed(0)}`}
                                    accent={monthlyProfit > 0 ? "text-emerald-600" : "text-rose-600"}
                                    sub={`€${dailyProfit.toFixed(0)}/día`} />
                            </div>
                        </div>
                    </div>

                    {/* ━━━ SIMULADOR ━━━ */}
                    <div className="rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border border-white/40 dark:border-white/5 shadow-md overflow-hidden">
                        <div className="px-4 py-2 border-b border-black/5 dark:border-white/5 flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-[11px] font-bold">Simulador de Impacto</span>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Price */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                                        <DollarSign className="w-3 h-3 text-amber-500" /> Precio PVP
                                    </div>
                                    <div className="text-right">
                                        <span className="text-base font-black font-mono text-foreground">€{p.toFixed(2)}</span>
                                    </div>
                                </div>
                                <Slider value={[p]} min={Math.max(c, 0.5)} max={Math.max(p * 2.5, 40)} step={0.5}
                                    onValueChange={([v]) => setPrice(v)} className="py-0.5" />
                                <div className="flex gap-1">
                                    {[
                                        { l: '-10%', f: 0.9 }, { l: '-5%', f: 0.95 },
                                        { l: '+5%', f: 1.05 }, { l: '+10%', f: 1.10 },
                                    ].map(btn => (
                                        <button key={`p${btn.l}`} onClick={() => nudge('price', btn.f)}
                                            className={cn(
                                                "flex-1 text-[9px] font-bold py-1 rounded-lg transition-all active:scale-95",
                                                btn.f > 1
                                                    ? "bg-emerald-500/8 text-emerald-600 hover:bg-emerald-500/15"
                                                    : "bg-rose-500/8 text-rose-600 hover:bg-rose-500/15"
                                            )}>
                                            {btn.l}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="h-px bg-black/5 dark:bg-white/5" />

                            {/* Cost */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                                        <Scale className="w-3 h-3 text-slate-400" /> Coste MP
                                    </div>
                                    <div className="text-right">
                                        <span className="text-base font-black font-mono text-foreground">€{c.toFixed(2)}</span>
                                    </div>
                                </div>
                                <Slider value={[c]} min={0} max={Math.max(c * 2.5, 20)} step={0.1}
                                    onValueChange={([v]) => setCost(v)} className="py-0.5" />
                                <div className="flex gap-1">
                                    {[
                                        { l: '-10%', f: 0.9 }, { l: '-5%', f: 0.95 },
                                        { l: '+5%', f: 1.05 }, { l: '+10%', f: 1.10 },
                                    ].map(btn => (
                                        <button key={`c${btn.l}`} onClick={() => nudge('cost', btn.f)}
                                            className={cn(
                                                "flex-1 text-[9px] font-bold py-1 rounded-lg transition-all active:scale-95",
                                                btn.f < 1
                                                    ? "bg-emerald-500/8 text-emerald-600 hover:bg-emerald-500/15"
                                                    : "bg-rose-500/8 text-rose-600 hover:bg-rose-500/15"
                                            )}>
                                            {btn.l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Impact footer */}
                        {simResult && simResult.profitChange !== 0 && (
                            <div className={cn(
                                "px-4 py-3 border-t flex items-center justify-between",
                                simResult.profitChange > 0
                                    ? "bg-emerald-500/5 border-emerald-500/10"
                                    : "bg-rose-500/5 border-rose-500/10"
                            )}>
                                <div>
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">
                                        Impacto estimado
                                    </span>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        Elasticidad → {simResult.newVolume.toFixed(0)} uds
                                    </p>
                                </div>
                                <span className={cn("text-xl font-black font-mono",
                                    simResult.profitChange > 0 ? "text-emerald-600" : "text-rose-600"
                                )}>
                                    {simResult.profitChange > 0 ? "+" : ""}€{simResult.profitChange.toFixed(0)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* ━━━ AI INSIGHTS ━━━ */}
                    {aiAdvice.length > 0 && (
                        <div className="rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border border-white/40 dark:border-white/5 shadow-md overflow-hidden">
                            <div className="px-4 py-2 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="text-[11px] font-bold">Insights IA</span>
                                </div>
                                <span className="text-[9px] font-mono text-muted-foreground">{aiAdvice.length}</span>
                            </div>
                            <div className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
                                {aiAdvice.map(a => (
                                    <InsightRow key={a.id} advice={a} onApply={() => {
                                        if (a.actionLabel === "Subir 10%") nudge('price', 1.10)
                                    }} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ━━━ PAIRING (Dog only) ━━━ */}
                    {pairing && (
                        <div className="rounded-2xl border border-amber-500/15 shadow-md overflow-hidden">
                            <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400" />
                            <div className="bg-amber-50/60 dark:bg-amber-500/5 p-4">
                                <div className="flex items-center gap-2 mb-2.5">
                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                    <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400">
                                        Estrategia de Rescate
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/70 dark:bg-white/5 border border-amber-200/50 dark:border-amber-500/10">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-bold truncate">{selectedItem.recipe?.name}</p>
                                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                            <ArrowRight className="w-3 h-3" />
                                            Combo con <strong className="text-foreground">{pairing.recipe?.name}</strong>
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-base font-black font-mono text-amber-700 dark:text-amber-400">
                                            €{(Number(selectedItem.price) + Number(pairing.price) * 0.85).toFixed(2)}
                                        </p>
                                        <p className="text-[8px] text-muted-foreground">-15% combo</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

/* ═══════════════════════════════════════════
   Insight Row — clean, horizontal layout
   ═══════════════════════════════════════════ */
function InsightRow({ advice, onApply }: { advice: MenuAdvice; onApply: () => void }) {
    const emoji = {
        opportunity: '💰', warning: '⚠️', info: '💡', success: '✅'
    }[advice.type]

    const accent = {
        opportunity: 'text-emerald-600 dark:text-emerald-400',
        warning: 'text-rose-600 dark:text-rose-400',
        info: 'text-blue-600 dark:text-blue-400',
        success: 'text-emerald-600 dark:text-emerald-400',
    }[advice.type]

    return (
        <div className="px-4 py-3 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
            <div className="flex items-start gap-2.5">
                <span className="text-sm mt-0.5 shrink-0">{emoji}</span>
                <div className="flex-1 min-w-0">
                    <p className={cn("text-[11px] font-bold leading-snug", accent)}>{advice.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{advice.description}</p>
                    {(advice.impact || advice.actionLabel) && (
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {advice.impact && (
                                <Badge variant="outline" className="h-4 text-[7px] font-semibold px-1.5">
                                    <Target className="w-2 h-2 mr-0.5" />{advice.impact}
                                </Badge>
                            )}
                            {advice.actionLabel && (
                                <button onClick={onApply}
                                    className="text-[9px] font-bold text-primary hover:underline flex items-center gap-0.5">
                                    {advice.actionLabel} →
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
