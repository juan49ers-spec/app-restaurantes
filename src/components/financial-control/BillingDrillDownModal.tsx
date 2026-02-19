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
    TrendingUp,
    Calendar,
    Search
} from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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

    if (!isOpen) return null

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {/* Header */}
                <header className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                    <div className="flex items-center gap-4">
                        <div className="bg-neutral-900 p-2.5 rounded-xl shadow-lg shadow-neutral-200">
                            <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-neutral-900">Detalle de Facturación</h2>
                            <p className="text-sm text-neutral-500 font-medium">Análisis profundo de ingresos netos</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-neutral-100 transition-colors">
                        <X className="w-6 h-6 text-neutral-500" />
                    </Button>
                </header>

                <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                    {/* Chart Section */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> Evolución del Mes
                            </h3>
                            <div className="flex gap-4">
                                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                                    <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Máximo
                                </span>
                                <span className="flex items-center gap-1.5 text-xs font-bold text-rose-500">
                                    <div className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Mínimo Op.
                                </span>
                                <span className="flex items-center gap-1.5 text-xs font-bold text-neutral-400">
                                    <div className="w-2.5 h-2.5 rounded-sm bg-neutral-200" /> Cerrado
                                </span>
                            </div>
                        </div>
                        <div className="h-[350px] w-full bg-neutral-50 p-6 rounded-2xl border border-neutral-100">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#A3A3A3', fontSize: 10, fontWeight: 600 }}
                                        tickFormatter={(val) => format(parseISO(val), 'dd')}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#A3A3A3', fontSize: 10, fontWeight: 600 }}
                                        tickFormatter={(val) => `${val}€`}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload as BillingDataPoint
                                                return (
                                                    <div className="bg-neutral-900 border-none rounded-xl p-3 shadow-xl">
                                                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                                                            {format(parseISO(d.date), "PPP", { locale: es })}
                                                        </p>
                                                        <p className="text-lg font-bold text-white mb-0.5">
                                                            {formatCurrency(d.netRevenue)}
                                                        </p>
                                                        <p className="text-[10px] text-neutral-400 font-medium">
                                                            Neto (Base Imponible)
                                                        </p>
                                                    </div>
                                                )
                                            }
                                            return null
                                        }}
                                    />
                                    <Bar dataKey="netRevenue" radius={[4, 4, 0, 0]}>
                                        {data.map((entry, index) => {
                                            let color = "#E2E8F0" // Default (Closed or light grey)
                                            if (entry.netRevenue > 0) {
                                                color = "#A3A3A3" // Standard Operative
                                                if (entry.netRevenue === stats.max) color = "#10B981"
                                                if (entry.netRevenue === stats.min) color = "#EF4444"
                                            }
                                            return <Cell key={`cell-${index}`} fill={color} />
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </section>

                    {/* Table Section */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400">Tabla de Operativa Diaria</h3>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar fecha..."
                                    className="pl-9 pr-4 py-2 bg-neutral-100 rounded-full text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-neutral-900/5 transition-all w-48"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="border border-neutral-100 rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-neutral-50/80 border-b border-neutral-100">
                                        <th className="px-6 py-4 font-bold text-neutral-400 uppercase tracking-widest">Fecha</th>
                                        <th className="px-6 py-4 font-bold text-neutral-400 uppercase tracking-widest text-right">Total Bruto</th>
                                        <th className="px-6 py-4 font-bold text-neutral-400 uppercase tracking-widest text-right">Total Neto</th>
                                        <th className="px-6 py-4 font-bold text-neutral-400 uppercase tracking-widest text-center">Variación</th>
                                        <th className="px-6 py-4 font-bold text-neutral-400 uppercase tracking-widest text-right">Digital (Neto)</th>
                                        <th className="px-6 py-4 font-bold text-neutral-400 uppercase tracking-widest text-right">Efectivo (Neto)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {tableData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-neutral-50/50 transition-colors group">
                                            <td className="px-6 py-4 font-bold text-neutral-700">
                                                {format(parseISO(row.date), "dd/MM/yyyy")}
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-neutral-500">
                                                {formatCurrency(row.totalRevenue)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={cn(
                                                    "font-bold",
                                                    row.netRevenue === stats.max ? "text-emerald-600" :
                                                        row.netRevenue === stats.min ? "text-rose-600" : "text-neutral-900"
                                                )}>
                                                    {formatCurrency(row.netRevenue)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-1">
                                                    {row.variation !== 0 ? (
                                                        <>
                                                            {row.variation > 0 ? (
                                                                <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                                                            ) : (
                                                                <ArrowDownRight className="w-3 h-3 text-rose-500" />
                                                            )}
                                                            <span className={cn(
                                                                "font-bold",
                                                                row.variation > 0 ? "text-emerald-500" : "text-rose-500"
                                                            )}>
                                                                {Math.abs(row.variation).toFixed(1)}%
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-neutral-300">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-neutral-600">
                                                {formatCurrency(row.card)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-neutral-600">
                                                {formatCurrency(row.cash)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-neutral-900 text-white font-bold">
                                    <tr>
                                        <td className="px-6 py-4 uppercase tracking-widest opacity-50">Totales Mes</td>
                                        <td className="px-6 py-4 text-right">
                                            {formatCurrency(tableData.reduce((acc, r) => acc + r.totalRevenue, 0))}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {formatCurrency(tableData.reduce((acc, r) => acc + r.netRevenue, 0))}
                                        </td>
                                        <td colSpan={3}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
