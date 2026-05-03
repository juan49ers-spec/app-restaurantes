"use client"

import { Calculator } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ChartDataItem } from "./constants"

export function CustomTooltip({ active, payload }: { active?: boolean, payload?: Array<{ payload: ChartDataItem }> }) {
    if (active && payload && payload.length) {
        const item = payload[0].payload
        return (
            <div className="glass-premium p-4 border border-white/20 shadow-2xl rounded-2xl animate-in zoom-in-95 duration-200 min-w-[200px]">
                <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-lg leading-tight">{item.name}</p>
                    <Badge className={cn(
                        "text-[10px] font-black uppercase px-1.5 py-0.5 border-none",
                        item.classification === 'STAR' && "bg-emerald-500/20 text-emerald-400",
                        item.classification === 'PLOWHORSE' && "bg-amber-500/20 text-amber-400",
                        item.classification === 'PUZZLE' && "bg-violet-500/20 text-violet-400",
                        item.classification === 'DOG' && "bg-rose-500/20 text-rose-400",
                    )}>
                        {item.classification === 'PLOWHORSE' ? 'VACA' : item.classification === 'PUZZLE' ? 'ENIGMA' : item.classification}
                    </Badge>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-white/10">
                    <div className="flex justify-between gap-8 text-xs">
                        <span className="text-white/40 uppercase tracking-wider font-bold">Margen</span>
                        <div className="flex flex-col items-end">
                            <span className="font-mono font-bold text-white">€{item.x.toFixed(2)}</span>
                            {item.hasMoved && (
                                <span className="text-[10px] text-white/50 line-through">€{item.originalX.toFixed(2)}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-between gap-8 text-xs">
                        <span className="text-white/40 uppercase tracking-wider font-bold">Ventas</span>
                        <span className="font-mono font-bold text-white">{item.z} ud.</span>
                    </div>
                </div>

                {item.hasMoved && (
                    <div className="mt-3 text-[10px] bg-amber-500/10 text-amber-400 p-2 rounded border border-amber-500/20 flex items-center gap-2">
                        <Calculator className="w-3 h-3" />
                        Simulación Activa
                    </div>
                )}
            </div>
        )
    }
    return null
}

interface DotProps {
    cx?: number
    cy?: number
    fill?: string
    payload?: ChartDataItem
    hoveredCategory?: string | null
    selectedCategory?: string | null
    isSimMode?: boolean
    editingId?: string | null
}

export function CustomDot(props: DotProps) {
    const { cx, cy, fill, payload, hoveredCategory, selectedCategory, isSimMode, editingId } = props
    if (!cx || !cy || !payload) return null

    const isHovered = hoveredCategory === payload.classification
    const isSelected = selectedCategory === payload.classification
    const isDimmed = (hoveredCategory && !isHovered) || (selectedCategory && !isSelected)
    const isEditing = editingId === payload.id

    const size = isEditing ? 14 : (isHovered || isSelected ? 12 : 8)

    return (
        <g className="transition-all duration-300">
            {isSimMode && !isDimmed && (
                <circle
                    cx={cx} cy={cy}
                    r={size + 6}
                    fill="none"
                    stroke={fill}
                    strokeWidth={1.5}
                    opacity={0.3}
                    className="animate-ping"
                />
            )}
            {isEditing && (
                <>
                    <circle cx={cx} cy={cy} r={size + 8} fill={fill} fillOpacity={0.08} />
                    <circle cx={cx} cy={cy} r={size + 4} fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="3 3" className="animate-spin" />
                </>
            )}
            {payload.classification === 'STAR' && !isSimMode && (
                <circle cx={cx} cy={cy} r={size + 4} fill={fill} fillOpacity={0.2} className="animate-pulse" />
            )}
            <circle
                cx={cx}
                cy={cy}
                r={size}
                fill={fill}
                fillOpacity={isDimmed ? 0.1 : 1}
                stroke={isEditing ? "#f59e0b" : "white"}
                strokeWidth={isEditing ? 3 : (isHovered || isSelected ? 3 : 1.5)}
                className={cn(
                    "transition-all duration-300",
                    isSimMode ? "cursor-pointer" : "cursor-default"
                )}
            />
            {isEditing && (
                <text x={cx} y={cy - size - 10} textAnchor="middle" fill="#f59e0b" fontSize={10} fontWeight={800}>
                    {payload.name}
                </text>
            )}
        </g>
    )
}
