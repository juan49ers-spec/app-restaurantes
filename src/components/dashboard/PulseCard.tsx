"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer } from "recharts"

interface PulseCardProps {
    title: string
    value: string
    subValue: string
    trend: number // percentage
    data: number[] // for sparkline
    color: "emerald" | "amber" | "rose" | "indigo" | "violet"
    restaurantName?: string
    icon?: React.ElementType
}


import { MetricDetailDialog } from "./MetricDetailDialog"

export function PulseCard({ title, value, subValue, trend, data, color, restaurantName, icon: Icon = TrendingUp }: PulseCardProps) {
    const chartData = data.map((val, i) => ({ i, val }))

    // Determine color codes
    const colors = {
        emerald: { str: "#10b981", bg: "bg-emerald-500", text: "text-emerald-600", light: "bg-emerald-50" },
        amber: { str: "#f59e0b", bg: "bg-amber-500", text: "text-amber-600", light: "bg-amber-50" },
        rose: { str: "#f43f5e", bg: "bg-rose-500", text: "text-rose-600", light: "bg-rose-50" },
        indigo: { str: "#6366f1", bg: "bg-indigo-500", text: "text-indigo-600", light: "bg-indigo-50" },
        violet: { str: "#8b5cf6", bg: "bg-violet-500", text: "text-violet-600", light: "bg-violet-50" },
    }[color]

    return (
        <MetricDetailDialog
            title={title}
            value={value}
            subValue={subValue}
            trend={trend}
            data={data}
            color={color}
            restaurantName={restaurantName}
        >
            <div className="cursor-pointer group relative">
                <Card className="overflow-hidden border-none shadow-sm group-hover:shadow-xl transition-all duration-300 bg-white/70 dark:bg-black/40 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 group-hover:scale-[1.02] group-hover:ring-primary/20">
                    <CardContent className="p-0">
                        <div className="p-6 pb-2">
                            <div className="flex justify-between items-start mb-4">
                                <div className={cn("p-2.5 rounded-xl transition-colors duration-300 group-hover:bg-white dark:group-hover:bg-black/50", colors.light)}>
                                    <Icon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", colors.text)} />
                                </div>
                                <span className={cn("flex items-center text-xs font-bold px-2 py-1 rounded-full bg-white/50 backdrop-blur-sm border border-black/5 group-hover:bg-white group-hover:shadow-sm transition-all",
                                    trend > 0 ? "text-emerald-600" : trend < 0 ? "text-rose-600" : "text-gray-600"
                                )}>
                                    {trend > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : trend < 0 ? <ArrowDownRight className="w-3 h-3 mr-1" /> : <Minus className="w-3 h-3 mr-1" />}
                                    {Math.abs(trend)}%
                                </span>
                            </div>

                            <div className="space-y-1">
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 transition-colors group-hover:text-primary/80">{title}</p>
                                <h3 className="text-3xl font-black tracking-tight text-foreground tabular-nums group-hover:tracking-normal transition-all">{value}</h3>
                                <p className="text-sm font-medium text-muted-foreground">{subValue}</p>
                            </div>
                        </div>

                        <div className="h-16 w-full mt-2 relative opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                            <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id={`gradient-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={colors.str} stopOpacity={0.2} />
                                            <stop offset="90%" stopColor={colors.str} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area
                                        type="monotone"
                                        dataKey="val"
                                        stroke={colors.str}
                                        strokeWidth={2.5}
                                        fill={`url(#gradient-${title.replace(/\s/g, '')})`}
                                        animationDuration={1500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Visual cue for interactivity */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-background/80 backdrop-blur rounded-full p-1 shadow-sm border">
                        <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                    </div>
                </div>
            </div>
        </MetricDetailDialog>
    )
}
