'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { AdminDashboardData, AuditLogEntry } from '@/app/actions/admin-queries'
import {
    Building2,
    TrendingUp,
    TrendingDown,
    Users,
    DollarSign,
    ArrowUpRight,
    Shield,
    Clock,
    ChevronRight,
    Utensils,
    Activity,
    UserMinus,
    UserPlus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BroadcastCenter } from './BroadcastCenter'

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)

const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

const ACTION_LABELS: Record<string, { label: string, color: string }> = {
    INSERT: { label: 'Creación', color: 'text-emerald-400 bg-emerald-500/10' },
    UPDATE: { label: 'Modificación', color: 'text-amber-400 bg-amber-500/10' },
    DELETE: { label: 'Eliminación', color: 'text-red-400 bg-red-500/10' }
}

const TABLE_LABELS: Record<string, string> = {
    daily_sales: 'Ventas Diarias',
    operating_expenses: 'Gastos',
    employees: 'Empleados',
    recipes: 'Recetas',
}

interface Props {
    data: AdminDashboardData
}

export function AdminDashboardClient({ data }: Props) {
    const netResult = data.totalSalesThisMonth - data.totalExpensesThisMonth
    const isPositive = netResult >= 0

    const kpis = useMemo(() => [
        {
            label: 'Restaurantes',
            value: data.totalRestaurants.toString(),
            icon: Building2,
            color: 'from-blue-500 to-blue-700',
            shadow: 'shadow-blue-500/20'
        },
        {
            label: 'Ventas (Mes)',
            value: formatCurrency(data.totalSalesThisMonth),
            icon: TrendingUp,
            color: 'from-emerald-500 to-emerald-700',
            shadow: 'shadow-emerald-500/20'
        },
        {
            label: 'Gastos (Mes)',
            value: formatCurrency(data.totalExpensesThisMonth),
            icon: TrendingDown,
            color: 'from-amber-500 to-amber-700',
            shadow: 'shadow-amber-500/20'
        },
        {
            label: 'Empleados',
            value: data.totalEmployees.toString(),
            icon: Users,
            color: 'from-purple-500 to-purple-700',
            shadow: 'shadow-purple-500/20'
        }
    ], [data])

    return (
        <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Panel de Administración</h1>
                <p className="text-sm text-neutral-400 mt-1">Visión global de todos los restaurantes y la actividad del sistema.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map(kpi => (
                    <div key={kpi.label} className="bg-white/5 border border-white/5 rounded-xl p-4 hover:bg-white/[0.07] transition-colors">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">{kpi.label}</span>
                            <div className={cn("p-1.5 rounded-lg bg-gradient-to-br", kpi.color, kpi.shadow)}>
                                <kpi.icon className="w-3.5 h-3.5 text-white" />
                            </div>
                        </div>
                        <p className="text-xl font-bold text-white tabular-nums">{kpi.value}</p>
                    </div>
                ))}
            </div>

            {/* System Health Banner */}
            {data.systemHealth && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Activos (7 días)</p>
                            <p className="text-2xl font-bold text-emerald-500 mt-1">{data.systemHealth.active_last_7_days}</p>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded-lg">
                            <Activity className="w-5 h-5 text-emerald-500" />
                        </div>
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">Nuevos (Semana)</p>
                            <p className="text-2xl font-bold text-amber-500 mt-1">{data.systemHealth.new_this_week}</p>
                        </div>
                        <div className="p-3 bg-amber-500/10 rounded-lg">
                            <UserPlus className="w-5 h-5 text-amber-500" />
                        </div>
                    </div>

                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-red-400 uppercase tracking-wider">Riesgo Fuga (&gt;15d)</p>
                            <p className="text-2xl font-bold text-red-500 mt-1">{data.systemHealth.inactive_over_15_days}</p>
                        </div>
                        <div className="p-3 bg-red-500/10 rounded-lg">
                            <UserMinus className="w-5 h-5 text-red-500" />
                        </div>
                    </div>
                </div>
            )
            }

            {/* Global Communications */}
            <BroadcastCenter initialBroadcasts={data.broadcasts} />

            {/* Net Result Banner */}
            <div className={cn(
                "rounded-xl border p-5 flex items-center justify-between",
                isPositive ? "bg-white/5 border-white/10" : "bg-red-500/5 border-red-500/20"
            )}>
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", isPositive ? "bg-emerald-500/10" : "bg-red-500/10")}>
                        <DollarSign className={cn("w-5 h-5", isPositive ? "text-emerald-400" : "text-red-400")} />
                    </div>
                    <div>
                        <p className="text-xs text-neutral-400 font-medium">Resultado Neto Global (Mes Actual)</p>
                        <p className={cn("text-2xl font-bold tabular-nums", isPositive ? "text-emerald-400" : "text-red-400")}>
                            {formatCurrency(netResult)}
                        </p>
                    </div>
                </div>
                <ArrowUpRight className={cn("w-6 h-6", isPositive ? "text-emerald-400" : "text-red-400", !isPositive && "rotate-180")} />
            </div>

            {/* Two Columns: Restaurants + Audit */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                {/* Restaurants Table */}
                <div className="xl:col-span-3 bg-white/5 border border-white/5 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-neutral-400" />
                            <h2 className="text-sm font-bold text-white">Restaurantes Registrados</h2>
                        </div>
                        <Link href="/admin/restaurants" className="text-xs text-neutral-400 hover:text-white transition-colors flex items-center gap-1">
                            Ver todos <ChevronRight className="w-3 h-3" />
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-white/5 text-neutral-500">
                                    <th className="text-left px-5 py-3 font-medium">Nombre</th>
                                    <th className="text-right px-5 py-3 font-medium">Ventas</th>
                                    <th className="text-right px-5 py-3 font-medium">Gastos</th>
                                    <th className="text-right px-5 py-3 font-medium">Empleados</th>
                                    <th className="text-right px-5 py-3 font-medium">Alta</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {data.restaurants.map(r => (
                                    <tr key={r.id} className="hover:bg-white/[0.03] transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-lg flex items-center justify-center">
                                                    <Utensils className="w-3 h-3 text-neutral-300" />
                                                </div>
                                                <span className="font-medium text-neutral-200 truncate max-w-[180px]">{r.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-right tabular-nums text-emerald-400 font-medium">{formatCurrency(r.salesThisMonth)}</td>
                                        <td className="px-5 py-3 text-right tabular-nums text-amber-400 font-medium">{formatCurrency(r.expensesThisMonth)}</td>
                                        <td className="px-5 py-3 text-right tabular-nums text-neutral-300">{r.employeeCount}</td>
                                        <td className="px-5 py-3 text-right text-neutral-500">{formatDate(r.created_at)}</td>
                                    </tr>
                                ))}
                                {data.restaurants.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-12 text-center text-neutral-500">
                                            No hay restaurantes registrados todavía.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Audit Log Feed */}
                <div className="xl:col-span-2 bg-white/5 border border-white/5 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-neutral-400" />
                            <h2 className="text-sm font-bold text-white">Actividad Reciente</h2>
                        </div>
                        <Link href="/admin/audit" className="text-xs text-neutral-400 hover:text-white transition-colors flex items-center gap-1">
                            Ver todo <ChevronRight className="w-3 h-3" />
                        </Link>
                    </div>
                    <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                        {data.recentAuditLogs.slice(0, 15).map((log: AuditLogEntry) => {
                            const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: 'text-neutral-400 bg-white/5' }
                            const tableName = TABLE_LABELS[log.table_name] || log.table_name

                            return (
                                <div key={log.id} className="px-5 py-3 hover:bg-white/[0.03] transition-colors">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-start gap-2.5 min-w-0">
                                            <div className={cn("mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase whitespace-nowrap", actionInfo.color)}>
                                                {actionInfo.label}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs text-neutral-300 font-medium truncate">
                                                    {tableName}
                                                </p>
                                                <p className="text-[10px] text-neutral-500 truncate">
                                                    ID: {log.record_id?.slice(0, 8)}...
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-neutral-500 whitespace-nowrap">
                                            <Clock className="w-3 h-3" />
                                            {formatTime(log.created_at)}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                        {data.recentAuditLogs.length === 0 && (
                            <div className="px-5 py-12 text-center">
                                <Shield className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
                                <p className="text-sm text-neutral-500">Sin actividad registrada</p>
                                <p className="text-xs text-neutral-600 mt-1">Las operaciones CRUD empezarán a aparecer aquí.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div >
    )
}
