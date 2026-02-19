'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import { Tooltip } from "@/components/ui/Tooltip"
import { EmptyState } from "@/components/ui/EmptyState"

interface InflationItem {
    name: string
    priceChange: number
    currentPrice: number
}

interface InflationWatchlistProps {
    items: InflationItem[]
}

export function InflationWatchlist({ items }: InflationWatchlistProps) {
    if (!items || items.length === 0) {
        return (
            <Card className="border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900 h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-slate-400" />
                        Vigilancia Inflación
                        <Tooltip content="Productos con mayor subida de precio de tus proveedores." asIcon />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <EmptyState
                        type="empty-good"
                        title="Precios estables"
                        description="No hay subidas significativas este mes"
                        icon="chart"
                    />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-red-500" />
                    Vigilancia Inflación
                    <Tooltip content="Productos con mayor subida de precio de tus proveedores." asIcon />
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-3">
                    {items.slice(0, 5).map((item, idx) => (
                        <li key={idx} className="flex items-center justify-between">
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                                    {item.name}
                                </p>
                                <p className="text-xs text-slate-400">
                                    Actual: {item.currentPrice.toFixed(2)}€
                                </p>
                            </div>
                            <span className="text-sm font-semibold text-red-500 flex-shrink-0">
                                +{item.priceChange.toFixed(1)}%
                            </span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    )
}
