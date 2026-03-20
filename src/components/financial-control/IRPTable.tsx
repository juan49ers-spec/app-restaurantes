"use client"

import { Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"

interface IRPTableProps {
    periodLabel: string
    data: {
        categoria: string
        modelo: string
        baseSujeta: number
        porcentajeRetencion: number
        cuotaIngresar: number
    }[]
}

export function IRPTable({ periodLabel, data }: IRPTableProps) {
    const totalRetenido = data.reduce((sum, item) => sum + item.cuotaIngresar, 0)
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)

    return (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden flex flex-col h-full shadow-sm">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-50 rounded-md">
                        <Users className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">Retenciones IRPF</h3>
                        <p className="text-[10px] text-neutral-500">Modelos 111 y 115</p>
                    </div>
                </div>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal text-neutral-500 bg-neutral-50">
                    {periodLabel}
                </Badge>
            </div>

            <div className="flex-1 overflow-auto">
                {data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                        <Users className="w-8 h-8 text-neutral-300 mb-3" />
                        <p className="text-sm font-medium text-neutral-500">Sin retenciones</p>
                        <p className="text-xs text-neutral-400 mt-1 text-center">Registra gastos con retención IRPF para ver el desglose</p>
                    </div>
                ) : (
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-neutral-50/50 border-b border-neutral-100">
                                <th className="px-3 py-2 text-left font-medium text-neutral-500">Concepto</th>
                                <th className="px-3 py-2 text-left font-medium text-neutral-500">Modelo</th>
                                <th className="px-3 py-2 text-right font-medium text-neutral-500">Base</th>
                                <th className="px-3 py-2 text-right font-medium text-neutral-500">%</th>
                                <th className="px-3 py-2 text-right font-medium text-rose-600">Cuota</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50">
                            {data.map((row, idx) => (
                                <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                                    <td className="px-3 py-2 font-medium text-neutral-700">{row.categoria}</td>
                                    <td className="px-3 py-2">
                                        <span className="px-1.5 py-0.5 bg-neutral-100 rounded text-[9px] font-medium text-neutral-600 border border-neutral-200">
                                            {row.modelo}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums text-neutral-500">
                                        {formatCurrency(row.baseSujeta)}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
                                        {row.porcentajeRetencion}%
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums font-bold text-rose-600">
                                        {formatCurrency(row.cuotaIngresar)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-neutral-50 font-bold border-t border-neutral-200">
                            <tr>
                                <td className="px-3 py-2 text-neutral-800" colSpan={4}>Total retenciones</td>
                                <td className="px-3 py-2 text-right tabular-nums text-rose-700">
                                    {formatCurrency(totalRetenido)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                )}
            </div>
        </div>
    )
}
