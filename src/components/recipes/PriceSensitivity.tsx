import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, TrendingUp, AlertTriangle } from "lucide-react"
import { useState } from "react"

interface Props {
    baseCost: number
    sellingPrice: number
    targetMargin?: number
    onApplyPrice?: (newPrice: number) => void
}

export function PriceSensitivity({ baseCost, sellingPrice, targetMargin = 70, onApplyPrice }: Props) {
    const [costVariance, setCostVariance] = useState(0) // % change in cost
    const [priceVariance, setPriceVariance] = useState(0) // % change in price

    // Simulations
    const simulatedCost = baseCost * (1 + costVariance / 100)
    const simulatedPrice = sellingPrice * (1 + priceVariance / 100)

    // Margin Calculation: ((Price - Cost) / Price) * 100
    const currentMargin = sellingPrice > 0 ? ((sellingPrice - baseCost) / sellingPrice) * 100 : 0
    const simulatedMargin = simulatedPrice > 0 ? ((simulatedPrice - simulatedCost) / simulatedPrice) * 100 : 0

    const marginDiff = simulatedMargin - currentMargin
    const isDangerous = simulatedMargin < 30
    const isBelowTarget = simulatedMargin < targetMargin

    return (
        <Card className="border-indigo-100 shadow-lg bg-white/80 backdrop-blur">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                    Simulador de Rentabilidad
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    Analiza cómo afecta la inflación o cambios de precio a tu margen.
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Sliders Grid */}
                <div className="grid gap-8 md:grid-cols-2">
                    {/* Cost Variance */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-slate-700">Variación Coste MP</label>
                            <Badge variant={costVariance > 0 ? "destructive" : "secondary"}>
                                {costVariance > 0 ? "+" : ""}{costVariance}%
                            </Badge>
                        </div>
                        <Slider
                            value={[costVariance]}
                            min={-20}
                            max={20}
                            step={1}
                            onValueChange={(vals) => setCostVariance(vals[0])}
                            className="py-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>-20% (Optimización)</span>
                            <span>+20% (Inflación)</span>
                        </div>
                    </div>

                    {/* Price Variance */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-slate-700">Ajuste PVP</label>
                            <Badge variant={priceVariance > 0 ? "default" : priceVariance < 0 ? "destructive" : "secondary"} className={priceVariance > 0 ? "bg-green-600" : ""}>
                                {priceVariance > 0 ? "+" : ""}{priceVariance}%
                            </Badge>
                        </div>
                        <Slider
                            value={[priceVariance]}
                            min={-20}
                            max={20}
                            step={1}
                            onValueChange={(vals) => setPriceVariance(vals[0])}
                            className="py-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>-20% (Oferta)</span>
                            <span>+20% (Subida)</span>
                        </div>
                    </div>
                </div>

                {/* Results Comparison */}
                <div className="bg-slate-50 rounded-xl p-4 border grid gap-4 md:grid-cols-3 items-center">
                    {/* Current State */}
                    <div className="text-center opacity-70">
                        <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Actual</div>
                        <div className="text-2xl font-mono font-bold text-slate-600">
                            {currentMargin.toFixed(1)}%
                        </div>
                        <div className="text-xs text-slate-500">Margin SC</div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                        <ArrowRight className={`h-6 w-6 ${marginDiff > 0 ? "text-green-500" : marginDiff < 0 ? "text-red-400" : "text-slate-300"}`} />
                    </div>

                    {/* Simulated State */}
                    <div className="text-center relative">
                        <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Simulado</div>
                        <div className={`text-3xl font-mono font-bold ${isDangerous ? "text-red-600" : isBelowTarget ? "text-yellow-600" : "text-green-600"
                            }`}>
                            {simulatedMargin.toFixed(1)}%
                        </div>
                        {/* Details */}
                        <div className="text-[10px] text-slate-500 mt-1 flex justify-center gap-2">
                            <span>Coste: €{simulatedCost.toFixed(2)}</span>
                            <span>PVP: €{simulatedPrice.toFixed(2)}</span>
                        </div>

                        {/* Warnings */}
                        {isDangerous && (
                            <div className="absolute top-0 right-0 -mr-2 -mt-2">
                                <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />
                            </div>
                        )}
                    </div>
                </div>



                {/* Apply Price Action */}
                {onApplyPrice && priceVariance !== 0 && (
                    <div className="flex justify-center pt-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                            onClick={() => onApplyPrice(simulatedPrice)}
                        >
                            Aplicar Nuevo Precio (€{simulatedPrice.toFixed(2)})
                        </Button>
                    </div>
                )}

                {/* Insight Message */}
                <div className="text-sm text-center text-muted-foreground italic">
                    {marginDiff < -5 ? (
                        "⚠️ Cuidado: Esta variación impacta severamente tu rentabilidad."
                    ) : marginDiff > 5 ? (
                        "🚀 Excelente: Una mejora significativa en el margen."
                    ) : (
                        "Sin cambios significativos en la estructura de costes."
                    )}
                </div>
            </CardContent>
        </Card >
    )
}
