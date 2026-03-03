"use client"

import { useMemo } from "react"
import { Scale } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface IVATableProps {
    year: number
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
    data: {
        month: string
        baseImponible: number
        ivaDevengado: number
        ivaDeducible: number
    }[]
}

export function IVATable({ year, quarter, data }: IVATableProps) {
    const dataWithResults = useMemo(() => {
        return data.map(row => ({
            ...row,
            resultado: row.ivaDevengado - row.ivaDeducible
        }))
    }, [data])

    const totalDevengado = dataWithResults.reduce((sum, row) => sum + row.ivaDevengado, 0)
    const totalDeducible = dataWithResults.reduce((sum, row) => sum + row.ivaDeducible, 0)
    const totalResultado = dataWithResults.reduce((sum, row) => sum + row.resultado, 0)
    const hasData = dataWithResults.some(row => row.baseImponible > 0 || row.ivaDevengado > 0 || row.ivaDeducible > 0)

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)

    return (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden flex flex-col h-full shadow-sm">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 rounded-md">
                        <Scale className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">Gestión de IVA</h3>
                        <p className="text-[10px] text-neutral-500">Modelo 303</p>
                    </div>
                </div>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal text-neutral-500 bg-neutral-50">
                    {quarter} {year}
                </Badge>
            </div>

            <div className="flex-1 overflow-auto">
                {!hasData ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                        <Scale className="w-8 h-8 text-neutral-300 mb-3" />
                        <p className="text-sm font-medium text-neutral-500">Sin datos de IVA</p>
                        <p className="text-xs text-neutral-400 mt-1 text-center">Registra ventas diarias para ver el desglose del Modelo 303</p>
                    </div>
                ) : (
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-neutral-50/50 border-b border-neutral-100">
                                <th className="px-3 py-2 text-left font-medium text-neutral-500">Mes</th>
                                <th className="px-3 py-2 text-right font-medium text-neutral-500">Base</th>
                                <th className="px-3 py-2 text-right font-medium text-emerald-600">Devengado (+)</th>
                                <th className="px-3 py-2 text-right font-medium text-rose-600">Soportado (-)</th>
                                <th className="px-3 py-2 text-right font-medium text-neutral-700">Resultado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50">
                            {dataWithResults.map((row, idx) => (
                                <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                                    <td className="px-3 py-2 font-medium text-neutral-700 capitalize">{row.month}</td>
                                    <td className="px-3 py-2 text-right tabular-nums text-neutral-500">
                                        {formatCurrency(row.baseImponible)}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums text-emerald-600 font-medium">
                                        +{formatCurrency(row.ivaDevengado)}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums text-rose-600 font-medium">
                                        -{formatCurrency(row.ivaDeducible)}
                                    </td>
                                    <td className={cn(
                                        "px-3 py-2 text-right tabular-nums font-bold",
                                        row.resultado >= 0 ? "text-rose-600" : "text-emerald-600"
                                    )}>
                                        {formatCurrency(row.resultado)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-neutral-50 font-bold border-t border-neutral-200">
                            <tr>
                                <td className="px-3 py-2 text-neutral-800">Total</td>
                                <td className="px-3 py-2 text-right tabular-nums text-neutral-400">
                                    -
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-emerald-700">
                                    {formatCurrency(totalDevengado)}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-rose-700">
                                    {formatCurrency(totalDeducible)}
                                </td>
                                <td className={cn(
                                    "px-3 py-2 text-right tabular-nums",
                                    totalResultado >= 0 ? "text-rose-700" : "text-emerald-700"
                                )}>
                                    {formatCurrency(totalResultado)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                )}
            </div>
        </div>
    )
}

