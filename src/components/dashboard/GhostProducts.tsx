'use client'

import { Ghost, CheckCircle } from "lucide-react"
import { Tooltip } from "@/components/ui/Tooltip"

interface GhostProduct {
    name: string
    totalRevenue: number
    percentOfSales?: number
}

interface GhostProductsProps {
    data: GhostProduct[] | null
}

export function GhostProducts({ data }: GhostProductsProps) {
    // Empty or no ghost products = good state
    if (!data || data.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Ghost className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                        Productos Ghost
                    </span>
                    <Tooltip content="Productos vendidos sin receta digital para calcular costes." asIcon />
                </div>
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 rounded p-2">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <p className="text-xs font-medium">Todos los productos tienen receta</p>
                </div>
            </div>
        )
    }

    const totalRisk = data.reduce((sum, g) => sum + g.totalRevenue, 0)

    return (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Ghost className="h-4 w-4 text-red-400" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                        Productos Ghost
                    </span>
                    <Tooltip content="Productos vendidos sin receta. Riesgo: no conoces el coste real." asIcon />
                </div>
                <span className="text-xs font-bold text-red-600">
                    {totalRisk.toLocaleString('es-ES')}€
                </span>
            </div>

            <ul className="space-y-1">
                {data.slice(0, 4).map((product, idx) => (
                    <li
                        key={idx}
                        className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800 last:border-0"
                    >
                        <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
                            {product.name}
                        </span>
                        <span className="text-slate-900 dark:text-white font-medium">
                            {product.totalRevenue.toLocaleString('es-ES')}€
                        </span>
                    </li>
                ))}
            </ul>
            {data.length > 4 && (
                <p className="text-[10px] text-slate-400 mt-2">+{data.length - 4} más sin receta</p>
            )}
        </div>
    )
}
