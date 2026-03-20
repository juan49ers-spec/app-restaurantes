"use client"

import { useState, useMemo } from "react"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from "recharts"
import {
    X,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    Search,
    BarChart3
} from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { m, AnimatePresence } from "framer-motion"

export interface BillingDataPoint {
    date: string
    netRevenue: number
    totalRevenue: number
    iva: number
    status: string
    cash: number
    card: number
}

interface BillingDrillDownModalProps {
    data: BillingDataPoint[]
    isOpen: boolean
    onClose: () => void
}

export function BillingDrillDownModal({ data, isOpen, onClose }: BillingDrillDownModalProps) {
    const [searchTerm, setSearchTerm] = useState("")

    const stats = useMemo(() => {
        if (!data.length) return { max: 0, min: 0 }
        const operativeDays = data.filter(d => d.netRevenue > 0)
        if (!operativeDays.length) return { max: 0, min: 0 }

        const revenues = operativeDays.map(d => d.netRevenue)
        return {
            max: Math.max(...revenues),
            min: Math.min(...revenues)
        }
    }, [data])

    const filteredData = useMemo(() => {
        return data.filter(d =>
            format(parseISO(d.date), "dd/MM/yyyy").includes(searchTerm)
        )
    }, [data, searchTerm])

    // Calculate variations
    const tableData = useMemo(() => {
        return [...filteredData].reverse().map((day, idx, arr) => {
            const prevDay = arr[idx + 1]
            const variation = prevDay && prevDay.netRevenue > 0
                ? ((day.netRevenue - prevDay.netRevenue) / prevDay.netRevenue) * 100
                : 0
            return { ...day, variation }
        })
    }, [filteredData])

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(val)

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 overflow-hidden">
                    <m.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-neutral-950/40 backdrop-blur-md cursor-pointer" 
                    />
                    
                    <m.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative bg-white/90 backdrop-blur-2xl w-full max-w-6xl h-full max-h-[90vh] rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col border border-white/40"
                    >
                        {/* Header Premium */}
                        <header className="px-8 py-6 border-b border-neutral-200/50 flex items-center justify-between bg-white/40 sticky top-0 z-20">
                            <div className="flex items-center gap-5">
                                <div className="bg-neutral-900 p-3 rounded-2xl shadow-xl shadow-neutral-900/10 scale-110">
                                    <BarChart3 className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
                                        Detalle Operativo
                                    </h2>
                                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-0.5">
                                        Análisis granular de ingresos
                                    </p>
                                </div>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={onClose} 
                                className="rounded-2xl hover:bg-neutral-900 hover:text-white transition-all duration-300 h-10 w-10"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-10 space-y-12 custom-scrollbar relative">
                            {/* Decorative gradients */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500/5 blur-[100px] rounded-full pointer-events-none" />

                            {/* Chart Section */}
                            <section className="space-y-6 relative z-10">
                                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                                    <div>
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-2 mb-2">
                                            <Calendar className="w-3.5 h-3.5" /> Evolución del Periodo
                                        </h3>
                                        <p className="text-sm font-medium text-neutral-500">Distribución de ingresos netos por jornada</p>
                                    </div>
                                    <div className="flex flex-wrap gap-4 bg-white/50 backdrop-blur-sm p-3 rounded-2xl border border-neutral-200/50">
                                        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-emerald-600">
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/40" /> Máximo
                                        </span>
                                        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-rose-500">
                                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-lg shadow-rose-500/40" /> Mínimo
                                        </span>
                                        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-neutral-400">
                                            <div className="w-2.5 h-2.5 rounded-full bg-neutral-200" /> Cerrado
                                        </span>
                                    </div>
                                </div>
                                
                                <m.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="h-[380px] w-full bg-white/40 backdrop-blur-sm p-6 rounded-[2rem] border border-neutral-200/60 shadow-inner"
                                >
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(229, 231, 235, 0.4)" />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                                tickFormatter={(val) => format(parseISO(val), 'dd')}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                                tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                                                dx={-10}
                                                width={40}
                                            />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(0,0,0,0.02)', radius: 8 }}
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const d = payload[0].payload as BillingDataPoint
                                                        return (
                                                            <div className="bg-neutral-900 border-none rounded-2xl p-4 shadow-2xl backdrop-blur-xl">
                                                                <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-2">
                                                                    {format(parseISO(d.date), "PPP", { locale: es })}
                                                                </p>
                                                                <p className="text-xl font-black text-white tracking-tighter mb-1">
                                                                    {formatCurrency(d.netRevenue)}
                                                                </p>
                                                                <div className="h-1 w-full bg-white/10 rounded-full mt-2 overflow-hidden">
                                                                    <div 
                                                                        className="h-full bg-emerald-400 rounded-full" 
                                                                        style={{ width: `${(d.netRevenue / stats.max) * 100}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )
                                                    }
                                                    return null
                                                }}
                                            />
                                            <Bar dataKey="netRevenue" radius={[8, 8, 0, 0]} barSize={24}>
                                                {data.map((entry, index) => {
                                                    let color = "#f1f5f9" // Default
                                                    if (entry.netRevenue > 0) {
                                                        color = "#e2e8f0" // Standard Operative
                                                        if (entry.netRevenue === stats.max) color = "#10B981"
                                                        if (entry.netRevenue === stats.min) color = "#EF4444"
                                                    }
                                                    return <Cell key={`cell-${index}`} fill={color} className="transition-all duration-500" />
                                                })}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </m.div>
                            </section>

                            {/* Table Section */}
                            <section className="space-y-8 relative z-10">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                    <div>
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-2">Registro de Operativa Diaria</h3>
                                        <p className="text-sm font-medium text-neutral-500">Historial completo detallado por jornada</p>
                                    </div>
                                    <div className="relative w-full sm:w-auto">
                                        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar fecha..."
                                            className="pl-11 pr-5 py-3 bg-white border border-neutral-200/60 rounded-2xl text-xs font-bold placeholder:text-neutral-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/50 transition-all w-full sm:w-64 shadow-sm"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="bg-white/40 backdrop-blur-sm border border-neutral-200/60 rounded-[2.5rem] overflow-hidden shadow-xl shadow-neutral-200/20 overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-neutral-900/5 border-b border-neutral-200/50">
                                                <th className="px-8 py-5 font-black text-neutral-400 uppercase tracking-[0.2em]">Fecha</th>
                                                <th className="px-8 py-5 font-black text-neutral-400 uppercase tracking-[0.2em] text-right">Total Bruto</th>
                                                <th className="px-8 py-5 font-black text-neutral-400 uppercase tracking-[0.2em] text-right">Total Neto</th>
                                                <th className="px-8 py-5 font-black text-neutral-400 uppercase tracking-[0.2em] text-center">Variación</th>
                                                <th className="px-8 py-5 font-black text-neutral-400 uppercase tracking-[0.2em] text-right">Digital</th>
                                                <th className="px-8 py-5 font-black text-neutral-400 uppercase tracking-[0.2em] text-right">Efectivo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-100">
                                            {tableData.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-white/80 transition-all duration-300 group cursor-default">
                                                    <td className="px-8 py-5 tabular-nums text-neutral-500 font-bold">
                                                        {format(parseISO(row.date), "dd/MM/yyyy")}
                                                    </td>
                                                    <td className="px-8 py-5 text-right font-extrabold text-neutral-400 tabular-nums">
                                                        {formatCurrency(row.totalRevenue)}
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <span className={cn(
                                                            "font-black text-sm tracking-tighter tabular-nums px-3 py-1.5 rounded-lg",
                                                            row.netRevenue === stats.max ? "bg-emerald-50 text-emerald-600" :
                                                                row.netRevenue === stats.min ? "bg-rose-50 text-rose-600" : "text-neutral-900"
                                                        )}>
                                                            {formatCurrency(row.netRevenue)}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            {row.variation !== 0 ? (
                                                                <div className={cn(
                                                                    "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-black tabular-nums",
                                                                    row.variation > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                                                                )}>
                                                                    {row.variation > 0 ? (
                                                                        <ArrowUpRight className="w-3 h-3 stroke-[3]" />
                                                                    ) : (
                                                                        <ArrowDownRight className="w-3 h-3 stroke-[3]" />
                                                                    )}
                                                                    {Math.abs(row.variation).toFixed(1)}%
                                                                </div>
                                                            ) : (
                                                                <span className="text-neutral-300 font-bold">-</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 text-right font-bold text-neutral-600 tabular-nums">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-sky-400/40" />
                                                            {formatCurrency(row.card)}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 text-right font-bold text-neutral-600 tabular-nums">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400/40" />
                                                            {formatCurrency(row.cash)}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-neutral-900 text-white border-t border-neutral-800">
                                            <tr className="divide-x divide-white/5">
                                                <td className="px-8 py-6 font-black uppercase tracking-[0.2em] text-[10px] text-neutral-400">Totales Periodo</td>
                                                <td className="px-8 py-6 text-right font-extrabold tabular-nums text-neutral-400">
                                                    {formatCurrency(tableData.reduce((acc, r) => acc + r.totalRevenue, 0))}
                                                </td>
                                                <td className="px-8 py-6 text-right font-black text-lg tracking-tighter tabular-nums text-emerald-400">
                                                    {formatCurrency(tableData.reduce((acc, r) => acc + r.netRevenue, 0))}
                                                </td>
                                                <td colSpan={3} className="px-8 py-6 text-right">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Análisis operativo completado</span>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </section>
                        </div>
                    </m.div>
                </div>
            )}
        </AnimatePresence>
    )
}
