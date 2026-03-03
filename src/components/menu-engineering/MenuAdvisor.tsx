"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useMenuEngineering } from "./MenuEngineeringContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
    TrendingUp,
    Zap,
    Target,
    Lightbulb,
    ExternalLink,
    LayoutDashboard,
    UtensilsCrossed,
    BarChart3,
    ArrowUpRight,
    ChevronRight,
    Flame
} from "lucide-react"
import { useMemo, useState } from "react"
import { MenuIntelligence, MenuAdvice } from "./menu-intelligence"
import { m, AnimatePresence } from "framer-motion"

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
    PRICE: { icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Precio' },
    PROMOTION: { icon: Zap, color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Promoción' },
    LAYOUT: { icon: LayoutDashboard, color: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Carta' },
    PSYCHOLOGY: { icon: Lightbulb, color: 'text-violet-600', bg: 'bg-violet-500/10', border: 'border-violet-500/20', label: 'Neuro' },
    RECIPE: { icon: UtensilsCrossed, color: 'text-rose-600', bg: 'bg-rose-500/10', border: 'border-rose-500/20', label: 'Receta' },
}

const TYPE_STYLES: Record<string, string> = {
    opportunity: 'border-l-emerald-500',
    warning: 'border-l-amber-500',
    info: 'border-l-blue-500',
    success: 'border-l-emerald-400',
}

function InsightCard({ rec, index }: { rec: MenuAdvice; index: number }) {
    const [expanded, setExpanded] = useState(false)
    const config = CATEGORY_CONFIG[rec.category] || { icon: Target, color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20', label: rec.category }
    const Icon = config.icon

    // Split title: dish name vs action
    const titleParts = rec.title.split(/[—→]/);
    const dishName = titleParts[0]?.trim().replace(/"/g, '') || ''
    const actionName = titleParts[1]?.trim() || rec.title

    return (
        <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.25 }}
        >
            <div
                className={cn(
                    "group relative border-l-[3px] rounded-r-lg transition-all duration-200 cursor-pointer",
                    "hover:bg-white dark:hover:bg-white/[0.04] hover:shadow-sm",
                    TYPE_STYLES[rec.type] || 'border-l-slate-300',
                    expanded ? "bg-white dark:bg-white/[0.03] shadow-sm" : ""
                )}
                onClick={() => setExpanded(!expanded)}
            >
                {/* Compact Row */}
                <div className="flex items-center gap-3 px-4 py-3">
                    {/* Category Icon */}
                    <div className={cn("p-1.5 rounded-md flex-shrink-0", config.bg, config.border, "border")}>
                        <Icon className={cn("w-3.5 h-3.5", config.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-foreground truncate">
                                {dishName}
                            </span>
                            <ChevronRight className={cn(
                                "w-3 h-3 text-muted-foreground/40 transition-transform duration-200 flex-shrink-0",
                                expanded && "rotate-90"
                            )} />
                        </div>
                        <span className="text-[10px] text-muted-foreground/70 font-medium truncate block">
                            {actionName}
                        </span>
                    </div>

                    {/* Impact Badge */}
                    {rec.impact && (
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-0.5 flex-shrink-0 whitespace-nowrap">
                            <ArrowUpRight className="w-2.5 h-2.5" />
                            {rec.impact}
                        </span>
                    )}
                </div>

                {/* Expanded Detail */}
                <AnimatePresence>
                    {expanded && (
                        <m.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="px-4 pb-3 pl-[52px]">
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {rec.description}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline" className={cn("text-[9px] h-5 px-1.5", config.bg, config.color, config.border)}>
                                        {config.label}
                                    </Badge>
                                    {rec.actionLabel && (
                                        <Button variant="ghost" size="sm" className="h-5 px-2 text-[10px] font-bold text-foreground hover:text-foreground/80">
                                            {rec.actionLabel} <ChevronRight className="w-3 h-3 ml-0.5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </m.div>
                    )}
                </AnimatePresence>
            </div>
        </m.div>
    )
}

export default function MenuAdvisor() {
    const {
        simulatedItems,
        isSimulationMode,
        revenueDelta,
        cogsDelta,
        currentScenarioId,
        scenarios,
        reportName
    } = useMenuEngineering()

    const { avgMargin, avgPopularity } = useMemo(() => {
        if (!simulatedItems.length) return { avgMargin: 0, avgPopularity: 0 }
        const totalMargin = simulatedItems.reduce((acc, i) => acc + Number(i.contribution_margin), 0)
        const totalPopularity = simulatedItems.reduce((acc, i) => acc + Number(i.popularity_pct), 0)
        return {
            avgMargin: totalMargin / simulatedItems.length,
            avgPopularity: totalPopularity / simulatedItems.length
        }
    }, [simulatedItems])

    const handleApplyToFinancials = () => {
        const scenario = scenarios.find(s => s.id === currentScenarioId)
        const source = scenario ? `Escenario: ${scenario.name}` : (reportName || "Simulación de Menú")

        const impact = {
            revenueDelta,
            cogsDelta,
            sourceName: source,
            timestamp: new Date().toISOString(),
            applied: false
        }
        localStorage.setItem('menu_simulation_impact', JSON.stringify(impact))
        toast.success("Impacto preparado", {
            description: `Los deltas de "${source}" se han enviado al Simulador Financiero.`
        })
    }

    const recommendations = useMemo(() => {
        if (!simulatedItems || simulatedItems.length === 0) return []

        const allAdvice: MenuAdvice[] = []
        simulatedItems.forEach(item => {
            const itemAdvice = MenuIntelligence.analyzeItem(item, avgMargin, avgPopularity * 100, simulatedItems)
            allAdvice.push(...itemAdvice)
        })

        return allAdvice.sort((a, b) => b.score - a.score).slice(0, 8)
    }, [simulatedItems, avgMargin, avgPopularity])

    // Category breakdown for mini-stats
    const categoryBreakdown = useMemo(() => {
        const counts: Record<string, number> = {}
        recommendations.forEach(r => {
            counts[r.category] = (counts[r.category] || 0) + 1
        })
        return counts
    }, [recommendations])

    return (
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-black/40 backdrop-blur-xl h-full flex flex-col rounded-3xl overflow-hidden ring-1 ring-black/5">
            {/* Header */}
            <CardHeader className="pb-3 pt-5 px-5 border-b border-black/5">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                            <div className="p-1 rounded-md bg-neutral-100 dark:bg-white/10">
                                <Flame className="w-3.5 h-3.5 text-orange-500" />
                            </div>
                            Insights Estratégicos
                            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-mono bg-neutral-100 dark:bg-white/10 text-muted-foreground border-0">
                                {recommendations.length}
                            </Badge>
                        </CardTitle>
                        <CardDescription className="text-[10px] font-medium text-muted-foreground/60 mt-0.5 ml-[30px]">
                            {isSimulationMode ? "Análisis de Escenario Simulado" : "Oportunidades detectadas en tiempo real"}
                        </CardDescription>
                    </div>
                    {isSimulationMode && (
                        <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-500/20 text-[9px] h-5">
                            Simulando
                        </Badge>
                    )}
                </div>

                {/* Category Pills */}
                {Object.keys(categoryBreakdown).length > 1 && (
                    <div className="flex gap-1.5 mt-3 flex-wrap">
                        {Object.entries(categoryBreakdown).map(([cat, count]) => {
                            const cfg = CATEGORY_CONFIG[cat]
                            if (!cfg) return null
                            return (
                                <div key={cat} className={cn("flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border", cfg.bg, cfg.color, cfg.border)}>
                                    <cfg.icon className="w-2.5 h-2.5" />
                                    {cfg.label} · {count}
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardHeader>

            {/* Insights Feed */}
            <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                {recommendations.length > 0 ? (
                    <div className="py-2 space-y-0.5">
                        {recommendations.map((rec, i) => (
                            <InsightCard key={rec.id} rec={rec} index={i} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center p-8 text-muted-foreground/40">
                        <div className="p-4 rounded-full bg-neutral-100 dark:bg-white/5 mb-4">
                            <BarChart3 className="w-8 h-8 opacity-30" />
                        </div>
                        <p className="text-xs font-medium">Todo optimizado</p>
                        <p className="text-[10px] mt-1 opacity-60">Simula cambios de precio para ver nuevas oportunidades</p>
                    </div>
                )}

                {/* Bridging Impact Footer */}
                {isSimulationMode && (Math.abs(revenueDelta) > 0.01 || Math.abs(cogsDelta) > 0.01) && (
                    <div className="sticky bottom-0 p-4 bg-white/95 dark:bg-black/90 backdrop-blur-md border-t border-black/5">
                        <div className="flex items-center justify-between mb-2.5 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">
                            <span>Impacto Simulación</span>
                            <span className="font-mono text-[9px] normal-case tracking-normal">{reportName}</span>
                        </div>
                        <div className="flex gap-2 mb-3">
                            <div className="flex-1 p-2.5 rounded-xl bg-neutral-50 dark:bg-white/5 border border-neutral-100 dark:border-white/10 flex justify-between items-center">
                                <span className="text-[9px] font-bold text-muted-foreground/50 uppercase">Ingresos</span>
                                <span className={cn("font-mono font-bold text-xs", revenueDelta >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                    {revenueDelta >= 0 ? "+" : ""}{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(revenueDelta)}
                                </span>
                            </div>
                            <div className="flex-1 p-2.5 rounded-xl bg-neutral-50 dark:bg-white/5 border border-neutral-100 dark:border-white/10 flex justify-between items-center">
                                <span className="text-[9px] font-bold text-muted-foreground/50 uppercase">Costes</span>
                                <span className={cn("font-mono font-bold text-xs", cogsDelta <= 0 ? "text-emerald-600" : "text-rose-600")}>
                                    {cogsDelta > 0 ? "+" : ""}{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cogsDelta)}
                                </span>
                            </div>
                        </div>
                        <Button
                            className="w-full bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-white/90 dark:text-neutral-900 text-white shadow-lg h-9 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all active:scale-[0.98]"
                            onClick={handleApplyToFinancials}
                        >
                            <ExternalLink className="mr-2 h-3 w-3" />
                            Aplicar al Plan Financiero
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
