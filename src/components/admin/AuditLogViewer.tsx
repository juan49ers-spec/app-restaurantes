'use client'

import { useState } from 'react'
import { AuditLogEntry } from '@/app/actions/admin'
import { cn } from '@/lib/utils'
import {
    Shield,
    Clock,
    ChevronDown,
    ChevronUp,
    Filter,
    Search,
    Database
} from 'lucide-react'

const ACTION_CONFIG: Record<string, { label: string, color: string, bg: string }> = {
    INSERT: { label: 'Creación', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    UPDATE: { label: 'Modificación', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    DELETE: { label: 'Eliminación', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' }
}

const TABLE_LABELS: Record<string, string> = {
    daily_sales: 'Ventas Diarias',
    operating_expenses: 'Gastos Operativos',
    employees: 'Empleados',
    recipes: 'Recetas',
}

function formatDateTime(dateStr: string) {
    const d = new Date(dateStr)
    return {
        date: d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }
}

function JsonDiff({ label, data }: { label: string, data: Record<string, unknown> | null }) {
    const [open, setOpen] = useState(false)
    if (!data) return null

    // Exclude noisy fields
    const filteredEntries = Object.entries(data).filter(([key]) =>
        !['created_at', 'updated_at', 'id', 'restaurant_id'].includes(key)
    )

    return (
        <div className="mt-2">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors"
            >
                {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {label} ({filteredEntries.length} campos)
            </button>
            {open && (
                <div className="mt-1.5 bg-black/30 rounded-lg border border-white/5 p-3 text-[10px] font-mono text-neutral-400 max-h-48 overflow-auto space-y-0.5">
                    {filteredEntries.map(([key, val]) => (
                        <div key={key}>
                            <span className="text-neutral-500">{key}:</span>{' '}
                            <span className="text-neutral-300">{JSON.stringify(val)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

interface Props {
    initialLogs: AuditLogEntry[]
    totalCount: number
}

export function AuditLogViewer({ initialLogs, totalCount }: Props) {
    const [filterAction, setFilterAction] = useState<string>('ALL')
    const [filterTable, setFilterTable] = useState<string>('ALL')
    const [searchQuery, setSearchQuery] = useState('')

    const filteredLogs = initialLogs.filter(log => {
        if (filterAction !== 'ALL' && log.action !== filterAction) return false
        if (filterTable !== 'ALL' && log.table_name !== filterTable) return false
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            return (
                log.table_name.toLowerCase().includes(q) ||
                log.record_id?.toLowerCase().includes(q) ||
                JSON.stringify(log.new_data)?.toLowerCase().includes(q)
            )
        }
        return true
    })

    const uniqueTables = [...new Set(initialLogs.map(l => l.table_name))]

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 bg-white/5 border border-white/5 rounded-xl p-4">
                <Filter className="w-4 h-4 text-neutral-400" />

                {/* Action Filter */}
                <select
                    value={filterAction}
                    onChange={e => setFilterAction(e.target.value)}
                    className="bg-white/5 border border-white/10 text-neutral-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-500/50"
                >
                    <option value="ALL">Todas las acciones</option>
                    <option value="INSERT">Creaciones</option>
                    <option value="UPDATE">Modificaciones</option>
                    <option value="DELETE">Eliminaciones</option>
                </select>

                {/* Table Filter */}
                <select
                    value={filterTable}
                    onChange={e => setFilterTable(e.target.value)}
                    className="bg-white/5 border border-white/10 text-neutral-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-500/50"
                >
                    <option value="ALL">Todas las tablas</option>
                    {uniqueTables.map(t => (
                        <option key={t} value={t}>{TABLE_LABELS[t] || t}</option>
                    ))}
                </select>

                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar por ID, tabla o contenido..."
                        className="w-full bg-white/5 border border-white/10 text-neutral-300 text-xs rounded-lg pl-9 pr-3 py-2 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-red-500/50"
                    />
                </div>

                <span className="text-[10px] text-neutral-500 ml-auto">
                    {filteredLogs.length} de {totalCount} registros
                </span>
            </div>

            {/* Log List */}
            <div className="bg-white/5 border border-white/5 rounded-xl overflow-hidden divide-y divide-white/5">
                {filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <Database className="w-10 h-10 text-neutral-700 mb-3" />
                        <p className="text-sm text-neutral-500 font-medium">Sin registros</p>
                        <p className="text-xs text-neutral-600 mt-1">Ajusta los filtros o espera a que se genere actividad.</p>
                    </div>
                ) : (
                    filteredLogs.map(log => {
                        const actionInfo = ACTION_CONFIG[log.action] || { label: log.action, color: 'text-neutral-400', bg: 'bg-white/5 border-white/10' }
                        const tableName = TABLE_LABELS[log.table_name] || log.table_name
                        const { date, time } = formatDateTime(log.created_at)

                        return (
                            <div key={log.id} className="px-5 py-4 hover:bg-white/[0.02] transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className={cn("mt-0.5 px-2 py-1 rounded-md border text-[10px] font-bold uppercase whitespace-nowrap", actionInfo.bg, actionInfo.color)}>
                                            {actionInfo.label}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <Shield className="w-3 h-3 text-neutral-600 flex-shrink-0" />
                                                <span className="text-xs font-medium text-neutral-200">{tableName}</span>
                                            </div>
                                            <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">
                                                Record: {log.record_id || '—'}
                                            </p>
                                            {log.changed_by && (
                                                <p className="text-[10px] text-neutral-600 mt-0.5">
                                                    Por: {log.changed_by.slice(0, 8)}...
                                                </p>
                                            )}

                                            {/* Expandable JSON Diff */}
                                            {log.action === 'UPDATE' && (
                                                <>
                                                    <JsonDiff label="Datos Anteriores" data={log.old_data} />
                                                    <JsonDiff label="Datos Nuevos" data={log.new_data} />
                                                </>
                                            )}
                                            {log.action === 'INSERT' && <JsonDiff label="Datos Creados" data={log.new_data} />}
                                            {log.action === 'DELETE' && <JsonDiff label="Datos Eliminados" data={log.old_data} />}
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                                            <Clock className="w-3 h-3" />
                                            {time}
                                        </div>
                                        <p className="text-[10px] text-neutral-600 mt-0.5">{date}</p>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
