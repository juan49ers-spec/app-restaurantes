"use client"

import { useState } from "react"
import { BarChart3, ChevronDown, ChevronUp, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface YearOverYearComparisonProps {
    currentQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
    currentYear: number
}

export function YearOverYearComparison({ currentQuarter, currentYear }: YearOverYearComparisonProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    
    // Mock data
    const currentTotal = 14700
    const previousTotal = 13200
    const variation = ((currentTotal - previousTotal) / previousTotal) * 100
    
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)
    
    return (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-3 flex items-center justify-between hover:bg-neutral-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-violet-50 rounded-lg">
                        <BarChart3 className="w-3.5 h-3.5 text-violet-600" />
                    </div>
                    <span className="text-xs font-bold text-neutral-900">vs Año pasado</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold",
                        variation > 0 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                    )}>
                        {variation > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                        ) : (
                            <TrendingDown className="w-3 h-3" />
                        )}
                        {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
                    </div>
                    {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
                    ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                    )}
                </div>
            </button>
            
            {isExpanded && (
                <div className="px-3 pb-3 border-t border-neutral-100">
                    <div className="pt-3 space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-neutral-600">{currentQuarter} {currentYear}</span>
                            <span className="font-bold text-neutral-900">{formatCurrency(currentTotal)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-neutral-600">{currentQuarter} {currentYear - 1}</span>
                            <span className="text-neutral-700">{formatCurrency(previousTotal)}</span>
                        </div>
                        <div className={cn(
                            "flex justify-between text-xs pt-2 border-t border-neutral-100",
                            variation > 0 ? "text-rose-600" : "text-emerald-600"
                        )}>
                            <span className="font-bold">Diferencia</span>
                            <span className="font-bold">
                                {variation > 0 ? '+' : ''}{formatCurrency(currentTotal - previousTotal)}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
