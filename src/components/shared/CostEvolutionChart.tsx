"use client"

import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Clock } from "lucide-react"

interface PriceHistoryPoint {
    price: number
    created_at: string
    change_pct?: number
}

interface Props {
    data: PriceHistoryPoint[]
    currentCost: number
    title?: string
}

export function CostEvolutionChart({ data, currentCost, title = "Evolución de Costes" }: Props) {
    // Format data for chart
    const chartData = data.map(d => ({
        price: d.price,
        date: new Date(d.created_at).toLocaleDateString(),
        fullDate: d.created_at,
        change: d.change_pct
    }))

    // Add current point if distinct from last history
    if (chartData.length > 0) {
        const last = chartData[chartData.length - 1]
        if (Math.abs(last.price - currentCost) > 0.01) {
            chartData.push({
                price: currentCost,
                date: "Hoy",
                fullDate: new Date().toISOString(),
                change: ((currentCost - last.price) / last.price) * 100
            })
        }
    } else {
        chartData.push({
            price: currentCost,
            date: "Hoy",
            fullDate: new Date().toISOString(),
            change: 0
        })
    }

    const startPrice = chartData[0]?.price || 0
    const totalChange = startPrice > 0 ? ((currentCost - startPrice) / startPrice) * 100 : 0
    const isPositive = totalChange <= 0 // Lower cost is good

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                        Histórico de variaciones de precio
                    </p>
                </div>
                <Badge variant={isPositive ? "default" : "destructive"} className={isPositive ? "bg-green-600" : ""}>
                    {isPositive ? <TrendingDown className="h-3 w-3 mr-1" /> : <TrendingUp className="h-3 w-3 mr-1" />}
                    {Math.abs(totalChange).toFixed(1)}%
                </Badge>
            </CardHeader>
            <CardContent>
                <div className="h-[200px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12, fill: "#6b7280" }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                domain={['auto', 'auto']}
                                tick={{ fontSize: 12, fill: "#6b7280" }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `€${val}`}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                labelStyle={{ color: '#374151', fontWeight: 600, marginBottom: '4px' }}
                                formatter={(val: number | string | undefined) => [`€${Number(val || 0).toFixed(2)}`, 'Coste']}
                            />
                            <Line
                                type="monotone"
                                dataKey="price"
                                stroke={totalChange > 0 ? "#ef4444" : "#16a34a"} // Red if cost went up
                                strokeWidth={2}
                                dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
