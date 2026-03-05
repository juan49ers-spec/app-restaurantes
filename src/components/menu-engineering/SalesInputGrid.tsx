"use client"

import { useState } from "react"
import { updateReportItem } from "@/app/actions/menu-engineering"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useMenuEngineering, SimulatedMenuItem } from "./MenuEngineeringContext"
import { toast } from "sonner"
import { Loader2, TrendingUp, Star, Beef, Brain, AlertTriangle, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
    items: SimulatedMenuItem[]
    reportId: string
    isAnalyzed?: boolean
}

const CLASSIFICATION_CONFIG: Record<string, {
    label: string
    icon: React.ElementType
    emoji: string
    bg: string
    text: string
    shadow: string
    border: string
    dot: string
}> = {
    STAR: {
        label: 'Estrella',
        icon: Star,
        emoji: '★',
        bg: 'bg-emerald-500',
        text: 'text-white',
        shadow: 'shadow-lg shadow-emerald-500/30',
        border: 'border-emerald-500/20',
        dot: 'bg-emerald-500',
    },
    PLOWHORSE: {
        label: 'Vaca',
        icon: Beef,
        emoji: '🐄',
        bg: 'bg-amber-500',
        text: 'text-white',
        shadow: 'shadow-lg shadow-amber-500/30',
        border: 'border-amber-500/20',
        dot: 'bg-amber-500',
    },
    PUZZLE: {
        label: 'Enigma',
        icon: Brain,
        emoji: '🔮',
        bg: 'bg-violet-500',
        text: 'text-white',
        shadow: 'shadow-lg shadow-violet-500/30',
        border: 'border-violet-500/20',
        dot: 'bg-violet-500',
    },
    DOG: {
        label: 'Perro',
        icon: AlertTriangle,
        emoji: '⚠️',
        bg: 'bg-rose-500',
        text: 'text-white',
        shadow: 'shadow-lg shadow-rose-500/30',
        border: 'border-rose-500/20',
        dot: 'bg-rose-500',
    },
}

export function SalesInputGrid({ items, isAnalyzed = false }: Props) {
    const { isSimulationMode, updateSimulatedItem } = useMenuEngineering()
    const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())

    const handleQuantityChange = async (itemId: string, newValue: string) => {
        const qty = parseFloat(newValue)
        if (isNaN(qty) || qty < 0) return

        setUpdatingIds(prev => new Set(prev).add(itemId))

        try {
            const res = await updateReportItem({ item_id: itemId, quantity_sold: qty })
            if (res?.error) {
                toast.error("Error", { description: res.error })
            }
        } catch {
            toast.error("Error", { description: "Failed to update" })
        } finally {
            setUpdatingIds(prev => {
                const newSet = new Set(prev)
                newSet.delete(itemId)
                return newSet
            })
        }
    }

    const maxQuantity = Math.max(...items.map(i => Number(i.quantity_sold) || 0), 1)

    // Aggregate stats
    const totalRevenue = items.reduce((sum, i) => sum + (Number(i.price_per_unit) * Number(i.quantity_sold)), 0)
    const totalCost = items.reduce((sum, i) => sum + (Number(i.cost_per_unit) * Number(i.quantity_sold)), 0)
    const avgFoodCost = totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0
    const totalUnits = items.reduce((sum, i) => sum + Number(i.quantity_sold), 0)

    return (
        <div className="rounded-3xl glass-card overflow-hidden transition-all duration-700 hover:shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-black/5 bg-white/30 dark:bg-white/5 backdrop-blur-md">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                    <div>
                        <h3 className="font-serif text-2xl font-black text-foreground flex items-center gap-3 tracking-tight">
                            <TrendingUp className="w-6 h-6 text-primary flex-shrink-0" />
                            Registro de Rendimiento
                        </h3>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-60">Datos de Operación</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px] tracking-[0.2em] font-black bg-white/50 dark:bg-white/10 border-none px-4 py-1.5 shadow-sm whitespace-nowrap">
                        {items.length} RECETAS ACTIVAS
                    </Badge>
                </div>

                {/* Aggregate KPI Strip */}
                {isAnalyzed && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                        <div className="bg-white/60 dark:bg-white/5 rounded-xl px-3 py-2 border border-black/5 dark:border-white/5">
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Ingresos</p>
                            <p className="text-sm font-black font-mono text-foreground">€{totalRevenue.toFixed(0)}</p>
                        </div>
                        <div className="bg-white/60 dark:bg-white/5 rounded-xl px-3 py-2 border border-black/5 dark:border-white/5">
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Costes</p>
                            <p className="text-sm font-black font-mono text-foreground">€{totalCost.toFixed(0)}</p>
                        </div>
                        <div className="bg-white/60 dark:bg-white/5 rounded-xl px-3 py-2 border border-black/5 dark:border-white/5">
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Food Cost</p>
                            <p className={cn("text-sm font-black font-mono", avgFoodCost > 35 ? "text-rose-600" : "text-emerald-600")}>{avgFoodCost.toFixed(1)}%</p>
                        </div>
                        <div className="bg-white/60 dark:bg-white/5 rounded-xl px-3 py-2 border border-black/5 dark:border-white/5">
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Unidades</p>
                            <p className="text-sm font-black font-mono text-foreground">{totalUnits}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent bg-black/[0.03] dark:bg-white/[0.03] border-b-black/5 dark:border-b-white/5 h-12">
                            <TableHead className="w-[280px] pl-6 text-[9px] uppercase tracking-[0.2em] font-black text-muted-foreground/80">Receta</TableHead>
                            <TableHead className="text-[9px] uppercase tracking-[0.2em] font-black text-muted-foreground/80">Categoría</TableHead>
                            <TableHead className="text-right text-[9px] uppercase tracking-[0.2em] font-black text-muted-foreground/80">Coste</TableHead>
                            <TableHead className="text-right text-[9px] uppercase tracking-[0.2em] font-black text-muted-foreground/80">Precio</TableHead>
                            {isAnalyzed && <TableHead className="text-right text-[9px] uppercase tracking-[0.2em] font-black text-muted-foreground/80">Margen</TableHead>}
                            {isAnalyzed && <TableHead className="text-right text-[9px] uppercase tracking-[0.2em] font-black text-muted-foreground/80">Food Cost</TableHead>}
                            <TableHead className="text-right text-[9px] uppercase tracking-[0.2em] font-black text-muted-foreground/80 w-[160px]">Volumen</TableHead>
                            {isAnalyzed && <TableHead className="text-center pr-6 text-[9px] uppercase tracking-[0.2em] font-black text-muted-foreground/80">Clasificación</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items && items.length > 0 ? items.map((item, index) => {
                            const price = Number(item.price_per_unit)
                            const cost = Number(item.cost_per_unit)
                            const margin = price - cost
                            const foodCost = price > 0 ? (cost / price) * 100 : 0
                            const config = CLASSIFICATION_CONFIG[item.classification || 'DOG']
                            const qty = Number(item.quantity_sold)
                            const barWidth = (qty / maxQuantity) * 100

                            return (
                                <TableRow
                                    key={item.id}
                                    className={cn(
                                        "transition-all duration-300 group hover:bg-primary/[0.03] dark:hover:bg-white/[0.03] border-b border-black/[0.03] dark:border-white/[0.03]",
                                        index % 2 === 0 ? 'bg-transparent' : 'bg-black/[0.015] dark:bg-white/[0.015]'
                                    )}
                                >
                                    {/* Recipe Name */}
                                    <TableCell className="pl-6 py-3.5">
                                        <div className="flex items-center gap-3">
                                            {isAnalyzed && (
                                                <div className={cn("w-1.5 h-8 rounded-full flex-shrink-0", config.dot)} />
                                            )}
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors leading-tight">{item.recipe?.name}</span>
                                                <span className="text-[9px] text-muted-foreground/40 font-mono tracking-tight">{item.recipe_id.slice(0, 8)}</span>
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Category */}
                                    <TableCell className="py-3.5">
                                        <span className="text-[10px] font-semibold text-muted-foreground/60 bg-black/[0.03] dark:bg-white/[0.05] px-2.5 py-1 rounded-full">
                                            {item.recipe?.category || "General"}
                                        </span>
                                    </TableCell>

                                    {/* Cost */}
                                    <TableCell className="font-mono text-sm text-right py-3.5">
                                        {isSimulationMode ? (
                                            <div className="relative inline-flex items-center">
                                                <span className="absolute left-3 text-[10px] text-primary/60 font-black">€</span>
                                                <input
                                                    aria-label="Coste"
                                                    type="number"
                                                    step="0.10"
                                                    className="w-24 pl-6 pr-3 py-1.5 text-xs border-2 border-amber-400/30 bg-amber-50/50 dark:bg-amber-500/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-foreground font-bold"
                                                    value={item.cost}
                                                    onChange={(e) => updateSimulatedItem(item.id, 'cost', Number(e.target.value))}
                                                />
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground/70 font-medium">€{cost.toFixed(2)}</span>
                                        )}
                                    </TableCell>

                                    {/* Price */}
                                    <TableCell className="font-mono text-sm text-right py-3.5">
                                        {isSimulationMode ? (
                                            <div className="relative inline-flex items-center">
                                                <span className="absolute left-3 text-[10px] text-primary/60 font-black">€</span>
                                                <input
                                                    aria-label="Precio"
                                                    type="number"
                                                    step="0.10"
                                                    className="w-24 pl-6 pr-3 py-1.5 text-xs border-2 border-amber-400/30 bg-amber-50/50 dark:bg-amber-500/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-foreground font-bold"
                                                    value={item.price}
                                                    onChange={(e) => updateSimulatedItem(item.id, 'price', Number(e.target.value))}
                                                />
                                            </div>
                                        ) : (
                                            <span className="font-semibold text-foreground/80">€{price.toFixed(2)}</span>
                                        )}
                                    </TableCell>

                                    {/* Margin */}
                                    {isAnalyzed && (
                                        <TableCell className="text-right py-3.5">
                                            <div className="flex items-center justify-end gap-1">
                                                {margin > 0 ? (
                                                    <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                                                ) : (
                                                    <ArrowDownRight className="w-3 h-3 text-rose-500" />
                                                )}
                                                <span className={cn("font-mono text-sm font-bold", margin > 0 ? "text-emerald-600" : "text-rose-600")}>
                                                    €{margin.toFixed(2)}
                                                </span>
                                            </div>
                                        </TableCell>
                                    )}

                                    {/* Food Cost */}
                                    {isAnalyzed && (
                                        <TableCell className="text-right py-3.5">
                                            <span className={cn(
                                                "font-mono text-xs font-bold px-2 py-0.5 rounded-md",
                                                foodCost > 40 ? "text-rose-700 bg-rose-100 dark:text-rose-400 dark:bg-rose-500/15" :
                                                    foodCost > 35 ? "text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/15" :
                                                        "text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/15"
                                            )}>
                                                {foodCost.toFixed(1)}%
                                            </span>
                                        </TableCell>
                                    )}

                                    {/* Volume with micro-bar */}
                                    <TableCell className="text-right py-3.5 relative">
                                        <div
                                            className="absolute inset-y-1 right-1 rounded-lg bg-primary/[0.04] dark:bg-primary/[0.08] -z-10 transition-all duration-1000 ease-out origin-right"
                                            style={{ width: `${barWidth}%` }}
                                        />
                                        <div className="relative flex justify-end items-center gap-3">
                                            <Input
                                                aria-label="Cantidad Vendida"
                                                type="number"
                                                min="0"
                                                className={cn(
                                                    "w-20 text-right h-8 font-mono text-sm font-bold transition-all duration-300 bg-white/50 dark:bg-white/5 border-black/10 dark:border-white/10 rounded-lg hover:bg-white dark:hover:bg-white/10 hover:border-black/20 focus:ring-primary/30",
                                                    updatingIds.has(item.id) && "bg-primary/10 border-primary animate-pulse"
                                                )}
                                                defaultValue={item.quantity_sold}
                                                onBlur={(e) => handleQuantityChange(item.id, e.target.value)}
                                                disabled={isAnalyzed}
                                            />
                                            {updatingIds.has(item.id) && (
                                                <div className="absolute -left-20 flex items-center gap-1.5">
                                                    <span className="text-[9px] text-primary font-black animate-pulse tracking-wider">SYNC</span>
                                                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Classification Badge */}
                                    {isAnalyzed && (
                                        <TableCell className="text-center pr-6 py-3.5">
                                            {config && (
                                                <Badge className={cn(
                                                    "text-[9px] font-black px-3 py-1 border-none tracking-wider",
                                                    config.bg, config.text, config.shadow
                                                )}>
                                                    {config.emoji} {config.label.toUpperCase()}
                                                </Badge>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            )
                        }) : (
                            <TableRow>
                                <TableCell colSpan={isAnalyzed ? 8 : 5} className="text-center py-20">
                                    <div className="flex flex-col items-center justify-center gap-6 opacity-30">
                                        <div className="h-24 w-24 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-5xl">
                                            🍽️
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-serif text-xl font-black">Sin registros activos</p>
                                            <p className="text-xs uppercase tracking-widest font-black">Asigne recetas para comenzar el análisis</p>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
