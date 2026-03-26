'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, TrendingUp, TrendingDown, Minus, Package, Clock, DollarSign } from "lucide-react"
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts"

interface ScorecardProps {
    metrics: {
        reliabilityScore: number
        trend: 'improving' | 'stable' | 'declining'
        totalOrders: number
        avgVariance: number
        onTimeRate: number
        totalSpend: number
        scoreHistory: { date: string; score: number }[]
        comparisonRank: number
        totalSuppliers: number
    }
    supplierName?: string
}

export function SupplierScorecard({ metrics, supplierName }: ScorecardProps) {
    const getScoreConfig = (score: number) => {
        if (score >= 80) return { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Excelente' }
        if (score >= 60) return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Bueno' }
        return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Mejorable' }
    }

    const TrendIcon = {
        improving: TrendingUp,
        stable: Minus,
        declining: TrendingDown
    }[metrics.trend]

    const trendColor = {
        improving: 'text-green-500',
        stable: 'text-slate-400',
        declining: 'text-red-500'
    }[metrics.trend]

    const trendLabel = {
        improving: 'Mejorando',
        stable: 'Estable',
        declining: 'Empeorando'
    }[metrics.trend]

    const config = getScoreConfig(metrics.reliabilityScore)

    return (
        <Card className={`border-slate-200 ${config.border}`}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-slate-600">
                        {supplierName ? `Scorecard: ${supplierName}` : 'Supplier Scorecard'}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs text-slate-500">
                        #{metrics.comparisonRank} de {metrics.totalSuppliers}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Main Score */}
                <div className="flex items-center gap-4">
                    <div className={`w-20 h-20 rounded-full ${config.bg} flex flex-col items-center justify-center border-2 ${config.border}`}>
                        <span className={`text-2xl font-bold ${config.color}`}>{metrics.reliabilityScore}</span>
                        <span className="text-[10px] text-slate-500">/ 100</span>
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                            <Badge className={`${config.bg} ${config.color} border-none`}>
                                <Star className="w-3 h-3 mr-1" />
                                {config.label}
                            </Badge>
                            <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
                                <TrendIcon className="w-3 h-3" />
                                <span>{trendLabel}</span>
                            </div>
                        </div>
                        {/* Mini Sparkline */}
                        {metrics.scoreHistory.length > 0 && (
                            <div className="h-10">
                                <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="100%">
                                    <LineChart data={metrics.scoreHistory}>
                                        <Line
                                            type="monotone"
                                            dataKey="score"
                                            stroke="#3b82f6"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                        <Tooltip
                                            contentStyle={{ fontSize: 10, padding: '4px 8px' }}
                                            formatter={(v) => [`${v}%`, 'Score']}
                                            labelFormatter={(label) => String(label)}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                        <Package className="w-4 h-4 text-slate-400" />
                        <div>
                            <p className="text-slate-500">Pedidos</p>
                            <p className="font-bold text-slate-900">{metrics.totalOrders}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <div>
                            <p className="text-slate-500">Puntualidad</p>
                            <p className="font-bold text-slate-900">{(metrics.onTimeRate * 100).toFixed(0)}%</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                        <TrendingUp className="w-4 h-4 text-slate-400" />
                        <div>
                            <p className="text-slate-500">Variación Precio</p>
                            <p className={`font-bold ${metrics.avgVariance > 5 ? 'text-red-600' : 'text-slate-900'}`}>
                                ±{metrics.avgVariance.toFixed(1)}%
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                        <DollarSign className="w-4 h-4 text-slate-400" />
                        <div>
                            <p className="text-slate-500">Gasto Total</p>
                            <p className="font-bold text-slate-900">€{metrics.totalSpend.toFixed(0)}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
