"use client"

import { Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"

interface IRPTableProps {
    restaurantId: string
    year: number
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
}

export function IRPTable({ restaurantId, year, quarter }: IRPTableProps) {
    const mockData = [
        { categoria: "Nóminas", modelo: "Mod. 111", baseSujeta: 8500, porcentajeRetencion: 12 },
        { categoria: "Alquiler", modelo: "Mod. 115", baseSujeta: 2000, porcentajeRetencion: 19 },
        { categoria: "Profesionales", modelo: "Mod. 111", baseSujeta: 3500, porcentajeRetencion: 7 },
    ].map(item => ({
        ...item,
        cuotaIngresar: item.baseSujeta * (item.porcentajeRetencion / 100)
    }))

    const totalRetenido = mockData.reduce((sum, item) => sum + item.cuotaIngresar, 0)
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)

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
                    {quarter} {year}
                </Badge>
            </div>

            <div className="flex-1 overflow-auto">
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
                        {mockData.map((row, idx) => (
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
            </div>
        </div>
    )
}
