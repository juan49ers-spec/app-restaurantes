
"use client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { exportMetricToPDF } from "@/lib/export-utils"

interface MetricDetailDialogProps {
    title: string
    value: string
    subValue: string
    trend: number
    data: number[]
    color: "emerald" | "amber" | "rose" | "indigo" | "violet"
    restaurantName?: string
    children: React.ReactNode
}

export function MetricDetailDialog({ title, value, subValue, trend, data, color, restaurantName, children }: MetricDetailDialogProps) {
    const chartData = data.map((val, i) => ({ i: `Día ${i + 1}`, val }))

    // Calculate some simple insights
    const maxVal = Math.max(...data)
    const minVal = Math.min(...data)
    const avgVal = data.reduce((a, b) => a + b, 0) / data.length

    const colors = {
        emerald: { str: "#10b981", bg: "bg-emerald-500", text: "text-emerald-600", light: "bg-emerald-50" },
        amber: { str: "#f59e0b", bg: "bg-amber-500", text: "text-amber-600", light: "bg-amber-50" },
        rose: { str: "#f43f5e", bg: "bg-rose-500", text: "text-rose-600", light: "bg-rose-50" },
        indigo: { str: "#6366f1", bg: "bg-indigo-500", text: "text-indigo-600", light: "bg-indigo-50" },
        violet: { str: "#8b5cf6", bg: "bg-violet-500", text: "text-violet-600", light: "bg-violet-50" },
    }[color]

    const handleViewFullBreakdown = () => {
        window.location.href = '/finance'
    }

    const handleDownloadReport = () => {
        exportMetricToPDF(title, value, trend, data, restaurantName)
        import("sonner").then(({ toast }) => {
            toast.success("Informe generado", {
                description: `El PDF de "${title}" se está descargando.`
            })
        })
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-wider font-bold">Análisis Detallado</span>
                    </div>
                    <DialogTitle className="text-2xl font-serif">{title}</DialogTitle>
                    <DialogDescription>
                        Evolución de los últimos 30 días comparado con el periodo anterior.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <span className="text-sm text-muted-foreground block mb-1">Valor Actual</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold tabular-nums">{value}</span>
                            <span className={cn("flex items-center text-xs font-bold px-1.5 py-0.5 rounded-md",
                                trend > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                                    trend < 0 ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" :
                                        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                            )}>
                                {trend > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : trend < 0 ? <ArrowDownRight className="w-3 h-3 mr-1" /> : <Minus className="w-3 h-3 mr-1" />}
                                {Math.abs(trend)}%
                            </span>
                        </div>
                        <span className="text-xs text-muted-foreground block mt-1">{subValue}</span>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <span className="text-xs font-medium text-muted-foreground">Máximo Periodo</span>
                            <span className="text-sm font-bold">{maxVal.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <span className="text-xs font-medium text-muted-foreground">Mínimo Periodo</span>
                            <span className="text-sm font-bold">{minVal.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <span className="text-xs font-medium text-muted-foreground">Promedio Diario</span>
                            <span className="text-sm font-bold">{avgVal.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</span>
                        </div>
                    </div>
                </div>

                <div className="h-[250px] w-full mt-4 bg-background border rounded-xl p-4">
                    <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id={`gradient-detail-${title}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={colors.str} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={colors.str} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis
                                dataKey="i"
                                className="text-[10px]"
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val, i) => i % 5 === 0 ? val : ''}
                            />
                            <YAxis
                                className="text-[10px]"
                                tickLine={false}
                                axisLine={false}
                                width={30}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                labelStyle={{ color: '#666' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="val"
                                stroke={colors.str}
                                strokeWidth={3}
                                fill={`url(#gradient-detail-${title})`}
                                animationDuration={1000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="flex justify-end gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={handleDownloadReport}>Descargar Informe</Button>
                    <Button size="sm" onClick={handleViewFullBreakdown}>Ver Desglose Completo</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
