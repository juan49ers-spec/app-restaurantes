"use client"

import { m, AnimatePresence } from "framer-motion"
import { RotateCcw, Wand2, X, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SimulatedMenuItem } from "./MenuEngineeringContext"

interface SimulationStartBannerProps {
    isVisible: boolean
    simulatedItems: SimulatedMenuItem[]
    onSelectItem: (id: string) => void
    onAutoOptimize: () => void
    onReset: () => void
    onClose: () => void
}

export function SimulationStartBanner({
    isVisible,
    simulatedItems,
    onSelectItem,
    onAutoOptimize,
    onReset,
    onClose,
}: SimulationStartBannerProps) {
    return (
        <AnimatePresence>
            {isVisible && (
                <m.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 24 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    className="absolute bottom-6 left-6 right-6 z-20"
                >
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl shadow-2xl shadow-amber-500/30 overflow-hidden">
                        <div className="px-4 lg:px-5 py-3 lg:py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 lg:p-2.5 bg-white/20 rounded-xl backdrop-blur-sm flex-shrink-0">
                                    <Wand2 className="w-4 h-4 lg:w-5 lg:h-5" />
                                </div>
                                <div>
                                    <p className="text-xs lg:text-sm font-bold">Modo Simulación</p>
                                    <p className="text-[10px] lg:text-[11px] opacity-90">Haz click en un gráfico para editar, o auto-optimiza</p>
                                </div>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-white/60 hover:bg-white/20 hover:text-white lg:hidden ml-auto flex-shrink-0" onClick={onClose}>
                                    <X className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                            <div className="flex items-center gap-1 lg:gap-2 overflow-x-auto scrollbar-none pb-1 lg:pb-0">
                                <Button
                                    size="sm"
                                    className="h-8 bg-white/20 hover:bg-white/30 text-white border-white/20 text-[10px] lg:text-[11px] font-bold backdrop-blur-sm whitespace-nowrap flex-shrink-0"
                                    onClick={onAutoOptimize}
                                >
                                    <Zap className="w-3 h-3 lg:w-3.5 lg:h-3.5 mr-1 lg:mr-1.5" /> Auto-Optimizar
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 text-[10px] text-white/80 hover:bg-white/20 hover:text-white flex-shrink-0" onClick={onReset}>
                                    <RotateCcw className="w-3 h-3 mr-1" /> Reset
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-white/60 hover:bg-white/20 hover:text-white hidden lg:flex flex-shrink-0" onClick={onClose}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="px-5 pb-3 flex gap-1.5 overflow-x-auto scrollbar-none">
                            {simulatedItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => onSelectItem(item.id)}
                                    className={cn(
                                        "flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all",
                                        "bg-white/15 hover:bg-white/30 border border-white/20"
                                    )}
                                >
                                    <span className={cn(
                                        "inline-block w-1.5 h-1.5 rounded-full mr-1.5",
                                        item.classification === 'STAR' && "bg-emerald-300",
                                        item.classification === 'PLOWHORSE' && "bg-amber-300",
                                        item.classification === 'PUZZLE' && "bg-violet-300",
                                        item.classification === 'DOG' && "bg-rose-300",
                                    )} />
                                    {item.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </m.div>
            )}
        </AnimatePresence>
    )
}
