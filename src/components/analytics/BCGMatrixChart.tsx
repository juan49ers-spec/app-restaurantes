import React from 'react'
import { EnrichedProduct } from "@/lib/menu-engineering"
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Cell,
    Label
} from 'recharts'

interface Props {
    products: EnrichedProduct[]
}

// Colors for Quadrants
const COLORS: Record<string, string> = {
    STAR: "#22c55e",      // Green
    PLOWHORSE: "#3b82f6", // Blue
    PUZZLE: "#eab308",    // Yellow
    DOG: "#ef4444",       // Red
    star: "#22c55e",
    plowhorse: "#3b82f6",
    puzzle: "#eab308",
    dog: "#ef4444"
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const item = payload[0].payload as EnrichedProduct
        const quadrant = item.quadrant || item.category || 'dog'
        return (
            <div className="bg-white p-3 border rounded shadow-lg text-sm z-50">
                <p className="font-bold mb-1">{item.name}</p>
                <p className="text-gray-600">
                    Ventas: <span className="font-mono font-medium text-black">{item.quantity_sold}</span>
                </p>
                <p className="text-gray-600">
                    Margen: <span className="font-mono font-medium text-black">€{(item.contribution_margin || 0).toFixed(2)}</span>
                </p>
                <div className="mt-2 flex items-center gap-2">
                    <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: COLORS[quadrant] || '#888' }}
                    />
                    <span className="text-xs font-semibold uppercase">{quadrant}</span>
                </div>
            </div>
        )
    }
    return null
}

export function BCGMatrixChart({ products }: Props) {
    // Guard against undefined/empty products
    if (!products || products.length === 0) {
        return (
            <div className="h-[500px] w-full flex items-center justify-center text-muted-foreground">
                No hay datos para mostrar
            </div>
        )
    }

    // Calculate averages from products
    const avgPopularity = products.reduce((acc, p) => acc + (p.popularity_rate || p.quantity_sold || 0), 0) / products.length
    const avgProfitability = products.reduce((acc, p) => acc + (p.profitability_rate || p.contribution_margin || 0), 0) / products.length

    return (
        <div className="h-[500px] w-full bg-white p-4 rounded-xl border relative">

            {/* Quadrant Labels Background */}
            <div className="absolute inset-0 z-0 pointer-events-none p-12 opacity-5">
                <div className="w-full h-full grid grid-cols-2 grid-rows-2">
                    <div className="flex items-start justify-start p-4 text-4xl font-black uppercase text-yellow-600">Puzzle</div>
                    <div className="flex items-start justify-end p-4 text-4xl font-black uppercase text-green-600">Star</div>
                    <div className="flex items-end justify-start p-4 text-4xl font-black uppercase text-red-600">Dog</div>
                    <div className="flex items-end justify-end p-4 text-4xl font-black uppercase text-blue-600">Plowhorse</div>
                </div>
            </div>

            <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis
                        type="number"
                        dataKey="popularity_rate"
                        name="Popularidad (Uds)"
                        unit=" uds"
                        tickFormatter={(value: number) => `${Number(value).toFixed(0)}`}
                    >
                        <Label value="Popularidad (Unidades Vendidas)" offset={-10} position="insideBottom" />
                    </XAxis>

                    <YAxis
                        type="number"
                        dataKey="profitability_rate"
                        name="Rentabilidad (€)"
                        unit="€"
                    >
                        <Label value="Rentabilidad (Margen de Contribución)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
                    </YAxis>

                    <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

                    {/* Quadrant Lines */}
                    <ReferenceLine x={avgPopularity} stroke="#000" strokeDasharray="4 4" label="Media Uds" />
                    <ReferenceLine y={avgProfitability} stroke="#000" strokeDasharray="4 4" label="Media Margen" />

                    <Scatter name="Productos" data={products}>
                        {products.map((entry, index) => {
                            const quadrant = entry.quadrant || entry.category || 'dog'
                            return (
                                <Cell key={`cell-${index}`} fill={COLORS[quadrant] || '#888'} />
                            )
                        })}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    )
}
