'use client'

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, BarChart3, Sparkles } from "lucide-react"
import { getMarketBenchmarks } from "@/app/actions/benchmarking"

interface Benchmark {
    ingredientId: string
    ingredientName: string
    yourPrice: number
    marketAvg: number
    percentile: number
    savingsPotential: number
}

export function MarketBenchmark() {
    const [benchmarks, setBenchmarks] = useState<Benchmark[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getMarketBenchmarks()
            .then(setBenchmarks)
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <Card className="animate-pulse">
                <CardContent className="h-48 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </CardContent>
            </Card>
        )
    }

    const totalSavings = benchmarks.reduce((acc, b) => acc + b.savingsPotential, 0)

    return (
        <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Market Benchmark
                </CardTitle>
                {totalSavings > 0 && (
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                        <Sparkles className="w-3 h-3 mr-1" />
                        €{totalSavings.toFixed(0)}/mes potencial
                    </Badge>
                )}
            </CardHeader>
            <CardContent className="space-y-3">
                {benchmarks.length === 0 ? (
                    <div className="text-center py-6 text-slate-400">
                        <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">¡Tus precios están en línea con el mercado!</p>
                        <p className="text-[10px]">Buen trabajo negociando con proveedores.</p>
                    </div>
                ) : (
                    benchmarks.slice(0, 5).map(b => (
                        <div key={b.ingredientId} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-slate-700 truncate max-w-[120px]">{b.ingredientName}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-red-600 font-medium">€{b.yourPrice.toFixed(2)}</span>
                                    <TrendingDown className="w-3 h-3 text-slate-400" />
                                    <span className="text-green-600 font-medium">€{b.marketAvg.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-red-400 to-amber-400 rounded-full transition-all"
                                        style={{ width: `${100 - b.percentile}%` }}
                                    />
                                </div>
                                <span className="text-[10px] text-green-600 font-medium whitespace-nowrap">
                                    €{b.savingsPotential.toFixed(0)}/mes
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    )
}
