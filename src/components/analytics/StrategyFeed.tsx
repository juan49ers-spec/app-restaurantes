import { EnrichedProduct } from "@/lib/menu-engineering"
import { AlertCircle, TrendingUp, Star, Target, Lightbulb } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Props {
    products: EnrichedProduct[]
}

// Quadrant configs for consistent styling
const QUADRANT_CONFIG = {
    STAR: {
        emoji: "⭐",
        bg: "bg-gradient-to-r from-green-50 to-emerald-50",
        border: "border-green-300",
        badge: "bg-green-100 text-green-700",
        icon: Star
    },
    PLOWHORSE: {
        emoji: "🐎",
        bg: "bg-gradient-to-r from-blue-50 to-cyan-50",
        border: "border-blue-300",
        badge: "bg-blue-100 text-blue-700",
        icon: TrendingUp
    },
    PUZZLE: {
        emoji: "🧩",
        bg: "bg-gradient-to-r from-yellow-50 to-amber-50",
        border: "border-yellow-300",
        badge: "bg-yellow-100 text-yellow-700",
        icon: Lightbulb
    },
    DOG: {
        emoji: "🐕",
        bg: "bg-gradient-to-r from-red-50 to-rose-50",
        border: "border-red-300",
        badge: "bg-red-100 text-red-700",
        icon: AlertCircle
    }
}

export function StrategyFeed({ products }: Props) {
    const suggestions = products
        .map(p => {
            let advice = { title: "", description: "", action: "", priority: 0 }

            if (p.quadrant === 'DOG') {
                advice = {
                    title: "Eliminar o Reinventar",
                    description: `Baja popularidad y bajo margen. No inviertas en marketing.`,
                    action: "Considera eliminarlo del menú",
                    priority: 4
                }
            } else if (p.quadrant === 'PLOWHORSE') {
                const priceIncrease = (p.price_per_unit * 0.10).toFixed(2)
                advice = {
                    title: "Subir Precio o Reducir Porción",
                    description: `Muy popular pero poco rentable.`,
                    action: `Subir +€${priceIncrease} = +€${(parseFloat(priceIncrease) * p.quantity_sold).toFixed(0)} beneficio`,
                    priority: 2
                }
            } else if (p.quadrant === 'PUZZLE') {
                advice = {
                    title: "Promocionar y Destacar",
                    description: `Alto margen pero pocas ventas. ¡Es una joya oculta!`,
                    action: "Destacar en pizarra o sugerir a camareros",
                    priority: 3
                }
            } else if (p.quadrant === 'STAR') {
                advice = {
                    title: "Mantener Excelencia",
                    description: `Tu mejor producto. No cambies nada.`,
                    action: "Asegurar stock y calidad constante",
                    priority: 1
                }
            }
            return { product: p, ...advice }
        })
        // Sort by priority (Stars first, then Plowhorses for quick wins, etc)
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 6)

    if (suggestions.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No hay suficientes datos para generar recomendaciones
            </div>
        )
    }

    return (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((item, idx) => {
                const config = QUADRANT_CONFIG[item.product.quadrant as keyof typeof QUADRANT_CONFIG]
                const Icon = config.icon

                return (
                    <div
                        key={idx}
                        className={`rounded-xl border p-4 ${config.bg} ${config.border} hover:shadow-md transition-all duration-200`}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">{config.emoji}</span>
                                <div>
                                    <h4 className="font-bold text-sm">{item.product.name}</h4>
                                    <Badge variant="outline" className={`text-[10px] mt-0.5 ${config.badge}`}>
                                        {item.product.quadrant}
                                    </Badge>
                                </div>
                            </div>
                            <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>

                        {/* Stats */}
                        <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                            <div>
                                <span className="font-semibold text-foreground">{item.product.quantity_sold}</span> uds
                            </div>
                            <div>
                                <span className="font-semibold text-foreground">€{item.product.contribution_margin.toFixed(2)}</span> margen
                            </div>
                            <div>
                                <span className="font-semibold text-foreground">{item.product.margin_pct.toFixed(0)}%</span>
                            </div>
                        </div>

                        {/* Recommendation */}
                        <div className="bg-white/80 rounded-lg p-2 border border-white/50">
                            <p className="font-medium text-sm">{item.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                            {item.action && (
                                <p className="text-xs font-medium text-indigo-600 mt-2 flex items-center gap-1">
                                    <Target className="h-3 w-3" />
                                    {item.action}
                                </p>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
