"use client"

import { RecipeIngredientInput } from "@/hooks/useRecipeCalculator"


interface Props {
    item: RecipeIngredientInput
}

export function CostBreakdownChart({ item }: Props) {
    // If no waste (100% yield), don't show much or show full bar
    const yieldPct = item.yield_pct * 100
    const wastePct = 100 - yieldPct

    // Monetary values
    // Monetary values
    const wasteCost = (item.quantity_gross - item.quantity_net) * item.price_per_unit

    if (item.quantity_gross <= 0) return null

    const yieldStyle = { width: `${yieldPct}%` };
    const wasteStyle = { width: `${wastePct}%` };

    return (
        <div className="w-full mt-3 space-y-1.5">
            {/* Visual Bar */}
            <div className="h-2 w-full flex rounded-full overflow-hidden bg-muted/50">
                <div
                    className="h-full bg-emerald-500/80 transition-all duration-300"
                    style={yieldStyle}
                    title={`Neto: ${yieldPct.toFixed(0)}%`}
                />
                <div
                    className="h-full bg-destructive/60 transition-all duration-300"
                    style={wasteStyle}
                    title={`Merma: ${wastePct.toFixed(0)}%`}
                />
            </div>

            {/* Legend / Info */}
            <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                    <span>Útil {yieldPct.toFixed(0)}%</span>
                </div>

                {wastePct > 0.5 && (
                    <div className="flex items-center gap-1.5 text-destructive/80 font-medium">
                        <span>Pérdida {wastePct.toFixed(0)}%</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-destructive/60" />
                    </div>
                )}
            </div>

            {/* Waste Monies */}
            {wastePct > 5 && wasteCost > 0.01 && (
                <div className="text-[10px] text-right text-destructive/70 italic">
                    (Estás tirando €{wasteCost.toFixed(3)})
                </div>
            )}
        </div>
    )
}
