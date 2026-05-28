"use client"

import React from "react"
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Label, Cell, ReferenceArea } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Calculator } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ChartDataItem {
    id: string
    name: string
    x: number
    y: number
    z: number
    classification?: 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG'
    originalX: number
    originalY: number
    hasMoved: boolean
}

export const MATRIX_COLORS = {
    STAR: '#10b981',
    PLOWHORSE: '#f59e0b',
    PUZZLE: '#8b5cf6',
    DOG: '#f43f5e',
    DEFAULT: '#94a3b8',
}

const quadrantConfig = {
    STAR: { bg: "rgba(16, 185, 129, 0.05)" },
    PLOWHORSE: { bg: "rgba(245, 158, 11, 0.05)" },
    PUZZLE: { bg: "rgba(139, 92, 246, 0.05)" },
    DOG: { bg: "rgba(244, 63, 94, 0.05)" },
}

const CustomTooltip = ({ active, payload }: { active?: boolean, payload?: Array<{ payload: ChartDataItem }> }) => {
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

const CustomDot = (props: DotProps) => {
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
                <circle cx={cx} cy={cy} r={size + 6} fill="none" stroke={fill} strokeWidth={1.5} opacity={0.3} className="animate-ping" />
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
                className={cn("transition-all duration-300", isSimMode ? "cursor-pointer" : "cursor-default")}
            />
            {isEditing && (
                <text x={cx} y={cy - size - 10} textAnchor="middle" fill="#f59e0b" fontSize={10} fontWeight={800}>
                    {payload.name}
                </text>
            )}
        </g>
    )
}

interface EngineeringMatrixChartProps {
    data: ChartDataItem[]
    avgPopularity: number
    avgMargin: number
    xDomainMax: number
    yDomainMax: number
    hoveredCategory?: string | null
    selectedCategory?: string | null
    isSimulationMode: boolean
    editingItemId?: string | null
    onEditItem: (itemId: string) => void
}

function colorForClassification(classification?: string) {
    switch (classification) {
        case 'STAR': return MATRIX_COLORS.STAR
        case 'PLOWHORSE': return MATRIX_COLORS.PLOWHORSE
        case 'PUZZLE': return MATRIX_COLORS.PUZZLE
        case 'DOG': return MATRIX_COLORS.DOG
        default: return MATRIX_COLORS.DEFAULT
    }
}

export function EngineeringMatrixChart({
    data,
    avgPopularity,
    avgMargin,
    xDomainMax,
    yDomainMax,
    hoveredCategory,
    selectedCategory,
    isSimulationMode,
    editingItemId,
    onEditItem,
}: EngineeringMatrixChartProps) {
    return (
        <div className="flex-1 w-full min-h-[400px] relative z-0">
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.05} stroke="#fff" />
                    <ReferenceArea x1={0} x2={avgMargin} y1={0} y2={avgPopularity * 100} fill={quadrantConfig.DOG.bg} />
                    <ReferenceArea x1={0} x2={avgMargin} y1={avgPopularity * 100} y2={yDomainMax} fill={quadrantConfig.PLOWHORSE.bg} />
                    <ReferenceArea x1={avgMargin} x2={xDomainMax} y1={0} y2={avgPopularity * 100} fill={quadrantConfig.PUZZLE.bg} />
                    <ReferenceArea x1={avgMargin} x2={xDomainMax} y1={avgPopularity * 100} y2={yDomainMax} fill={quadrantConfig.STAR.bg} />

                    <XAxis type="number" dataKey="x" name="Margen" unit="€" domain={[0, xDomainMax]}
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                        axisLine={{ stroke: '#ffffff10', strokeWidth: 1 }}
                        tickLine={false}
                        tickMargin={15}
                    >
                        <Label value="RENTABILIDAD (€ GANADO POR PLATO)" offset={-25} position="insideBottom" fill="#64748b" className="text-[10px] font-black uppercase tracking-[0.2em]" />
                    </XAxis>
                    <YAxis type="number" dataKey="y" name="Popularidad" unit="%" domain={[0, yDomainMax]}
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                        axisLine={{ stroke: '#ffffff10', strokeWidth: 1 }}
                        tickLine={false}
                        tickMargin={15}
                    >
                        <Label value="POPULARIDAD (CANTIDAD VENDIDA)" angle={-90} position="insideLeft" offset={0} fill="#64748b" className="text-[10px] font-black uppercase tracking-[0.2em]" />
                    </YAxis>

                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f59e0b', strokeWidth: 1.5, strokeDasharray: '6 6', opacity: 0.4 }} />
                    <ReferenceLine x={avgMargin} stroke="#ffffff40" strokeWidth={2} strokeDasharray="5 5" />
                    <ReferenceLine y={avgPopularity * 100} stroke="#ffffff40" strokeWidth={2} strokeDasharray="5 5" />

                    <ReferenceArea x1={avgMargin} x2={xDomainMax} y1={avgPopularity * 100} y2={yDomainMax} fill={MATRIX_COLORS.STAR} fillOpacity={0.03} label={{ value: 'ESTRELLAS', fill: MATRIX_COLORS.STAR, fontSize: 14, fontWeight: 900, opacity: 0.15, position: 'center' }} />
                    <ReferenceArea x1={0} x2={avgMargin} y1={avgPopularity * 100} y2={yDomainMax} fill={MATRIX_COLORS.PLOWHORSE} fillOpacity={0.03} label={{ value: 'VACAS', fill: MATRIX_COLORS.PLOWHORSE, fontSize: 14, fontWeight: 900, opacity: 0.15, position: 'center' }} />
                    <ReferenceArea x1={avgMargin} x2={xDomainMax} y1={0} y2={avgPopularity * 100} fill={MATRIX_COLORS.PUZZLE} fillOpacity={0.03} label={{ value: 'ENIGMAS', fill: MATRIX_COLORS.PUZZLE, fontSize: 14, fontWeight: 900, opacity: 0.15, position: 'center' }} />
                    <ReferenceArea x1={0} x2={avgMargin} y1={0} y2={avgPopularity * 100} fill={MATRIX_COLORS.DOG} fillOpacity={0.03} label={{ value: 'PERROS', fill: MATRIX_COLORS.DOG, fontSize: 14, fontWeight: 900, opacity: 0.15, position: 'center' }} />

                    {isSimulationMode && (
                        <g>
                            {data.filter(d => d.hasMoved).map((d) => (
                                <React.Fragment key={`trail-${d.id}`}>
                                    <ReferenceLine
                                        segment={[{ x: d.originalX, y: d.originalY }, { x: d.x, y: d.y }]}
                                        stroke="#f59e0b"
                                        strokeWidth={1.5}
                                        strokeDasharray="4 4"
                                        opacity={0.4}
                                    />
                                    <Scatter
                                        data={[{ x: d.originalX, y: d.originalY }]}
                                        fill="transparent"
                                        shape="circle"
                                        stroke="#64748b"
                                        strokeDasharray="2 2"
                                        pointerEvents="none"
                                        opacity={0.3}
                                    />
                                </React.Fragment>
                            ))}
                        </g>
                    )}

                    <Scatter
                        name="Platos"
                        data={data}
                        shape={(props) => (
                            <CustomDot
                                {...props}
                                hoveredCategory={hoveredCategory}
                                selectedCategory={selectedCategory}
                                isSimMode={isSimulationMode}
                                editingId={editingItemId}
                            />
                        )}
                        onClick={(dataItem) => {
                            if (dataItem?.payload && isSimulationMode) {
                                onEditItem(dataItem.payload.id)
                            }
                        }}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colorForClassification(entry.classification)} />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    )
}
