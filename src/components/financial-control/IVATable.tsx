"use client"

import { useMemo } from "react"
import { Scale } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface IVATableProps {
    restaurantId: string
    year: number
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
}

export function IVATable({ restaurantId, year, quarter }: IVATableProps) {
    const quarterNum = parseInt(quarter[1])
    const quarterMonths = useMemo(() => {
        const months: string[] = []
        for (let i = 0; i < 3; i++) {
            const monthNum = (quarterNum - 1) * 3 + i + 1
            const date = new Date(year, monthNum - 1, 1)
            const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(date)
            months.push(monthName.charAt(0).toUpperCase() + monthName.slice(1))
        }
        return months
    }, [quarterNum, year])

    const mockData = useMemo(() => {
        const getHash = (str: string) => {
            let hash = 0
            for (let i = 0; i < str.length; i++) {
                hash = ((hash << 5) - hash) + str.charCodeAt(i)
                hash |= 0
            }
            return Math.abs(hash)
        }

        return quarterMonths.map(month => {
            const seed = getHash(month + year)
            return {
                month,
                baseImponible: (seed % 5000) + 8000,
                ivaDevengado: (seed % 800) + 200,
                ivaDeducible: (seed % 600) + 150,
            }
        })
    }, [quarterMonths, year])

    const dataWithResults = useMemo(() => {
        return mockData.map(row => ({
            ...row,
            resultado: row.ivaDevengado - row.ivaDeducible
        }))
    }, [mockData])

    const totalDevengado = dataWithResults.reduce((sum, row) => sum + row.ivaDevengado, 0)
    const totalDeducible = dataWithResults.reduce((sum, row) => sum + row.ivaDeducible, 0)
    const totalResultado = dataWithResults.reduce((sum, row) => sum + row.resultado, 0)

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
            </div>
        </div>
    )
}

