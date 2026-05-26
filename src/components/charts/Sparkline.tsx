'use client'

import { LineChart, Line, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

interface SparklineProps {
    data: { date: string, price: number }[]
    width?: number
    height?: number
    color?: string
}

export function Sparkline({ data, width = 100, height = 30, color = "#2563eb" }: SparklineProps) {
    if (!data || data.length < 2) return null

    // Calculate min/max for domain to make chart look dynamic
    const prices = data.map(d => d.price)
    const min = Math.min(...prices) * 0.95
    const max = Math.max(...prices) * 1.05

    return (
        <div style={{ width, height }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <YAxis domain={[min, max]} hide />
                    <Tooltip
                        contentStyle={{ fontSize: '10px', padding: '4px' }}
                        itemStyle={{ padding: 0 }}
                        labelStyle={{ display: 'none' }}
                        formatter={(value: number | undefined) => [`${value?.toFixed(2)}€`, '']}
                    />
                    <Line
                        type="monotone"
                        dataKey="price"
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
