'use client'

import { cn } from "@/lib/utils"
import { Tooltip } from "@/components/ui/Tooltip"
import { EmptyState } from "@/components/ui/EmptyState"
import { Grid3X3 } from "lucide-react"
import type { BCGMetrics } from "@/app/actions/financial-engine"

interface BCGItem {
    name: string
    popularity?: number
    margin?: number
}

interface BCGMatrixProps {
    data: BCGMetrics | null | undefined
}

const Section = ({
    title,
    items,
    bgColor,
    tooltip
}: {
    title: string
    items: any[]
    bgColor: string
    tooltip: string
}) => (
    <div className={cn("rounded p-2.5", bgColor)}>
        <div className="flex items-center gap-1 mb-1.5">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">{title}</h4>
            <Tooltip content={tooltip} asIcon />
        </div>
        {items.length > 0 ? (
            <ul className="space-y-0.5">
                {items.slice(0, 3).map((item, i) => (
                    <li key={i} className="text-xs text-slate-600 dark:text-slate-400 truncate">
                        {item.name}
                    </li>
                ))}
                {items.length > 3 && (
                    <li className="text-[10px] text-slate-400">+{items.length - 3} más</li>
                )}
            </ul>
        ) : (
            <p className="text-[10px] text-slate-400 italic">Ninguno</p>
        )}
    </div>
)

export function BCGMatrix({ data }: BCGMatrixProps) {
    if (!data) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Grid3X3 className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                        Análisis Menú
                    </span>
                </div>
                <EmptyState
                    type="connect"
                    title="Sin datos de productos"
                    description="Importa ventas para clasificar el menú"
                />
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-3">
                <Grid3X3 className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Análisis Menú (BCG)
                </span>
                <Tooltip content="Clasifica productos por popularidad y margen para decidir estrategia." asIcon />
            </div>

            <div className="grid grid-cols-2 gap-2">
                <Section
                    title="Estrellas"
                    items={data.stars.map(s => ({ name: s.name, popularity: s.totalQty, margin: s.unitMargin }))}
                    bgColor="bg-emerald-50 dark:bg-emerald-900/20"
                    tooltip="Alta popularidad + Alto margen. Mantener y promocionar."
                />
                <Section
                    title="Vacas"
                    items={data.cows.map(c => ({ name: c.name, popularity: c.totalQty, margin: c.unitMargin }))}
                    bgColor="bg-blue-50 dark:bg-blue-900/20"
                    tooltip="Alta popularidad + Bajo margen. Rentabilizar subiendo precio."
                />
                <Section
                    title="Incógnitas"
                    items={data.puzzles.map(p => ({ name: p.name, popularity: p.totalQty, margin: p.unitMargin }))}
                    bgColor="bg-amber-50 dark:bg-amber-900/20"
                    tooltip="Baja popularidad + Alto margen. Promocionar para aumentar ventas."
                />
                <Section
                    title="Perros"
                    items={data.dogs.map(d => ({ name: d.name, popularity: d.totalQty, margin: d.unitMargin }))}
                    bgColor="bg-slate-100 dark:bg-slate-800"
                    tooltip="Baja popularidad + Bajo margen. Considerar eliminar del menú."
                />
            </div>
        </div>
    )
}
