"use client"

import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Brain } from "lucide-react"
import { useMenuEngineering, SimulatedMenuItem } from "./MenuEngineeringContext"
import { cn } from "@/lib/utils"

interface Props {
    items: SimulatedMenuItem[]
}

export function InsightStrip({ items }: Props) {
    const { selectedCategory } = useMenuEngineering()
    const [currentInsight, setCurrentInsight] = useState(0)

    const displayInsights = useMemo(() => {
        const baseInsights: string[] = []

        if (selectedCategory) {
            const categoryItems = items.filter((i) => i.classification === selectedCategory)
            const count = categoryItems.length

            switch (selectedCategory) {
                case 'STAR':
                    baseInsights.push(`JOYAS DE LA CORONA: Tienes ${count} platos de rendimiento excepcional.`)
                    baseInsights.push(`ESTRATEGIA: Blindaje de calidad. Mantener visibilidad máxima en carta.`)
                    if (count > 0) {
                        const topStar = [...categoryItems].sort((a, b) => Number(b.quantity_sold) - Number(a.quantity_sold))[0]
                        baseInsights.push(`DESTACADO: "${topStar.recipe?.name}" es el líder indiscutible en ingresos.`)
                    }
                    break
                case 'PLOWHORSE':
                    baseInsights.push(`PILARES ANALÍTICOS: ${count} platos impulsan el volumen pero diluyen margen.`)
                    baseInsights.push(`ESTRATEGIA: Ingeniería de costes o ajuste táctico de precios (+3-5%).`)
                    break
                case 'PUZZLE':
                    baseInsights.push(`OPORTUNIDADES OCULTAS: ${count} platos de alto margen infrautilizados.`)
                    baseInsights.push(`ESTRATEGIA: Campaña de marketing dirigida o "sugerencia del chef".`)
                    break
                case 'DOG':
                    baseInsights.push(`FUGAS DE VALOR: ${count} platos consumen recursos sin aportar valor.`)
                    baseInsights.push(`ESTRATEGIA: Eliminación quirúrgica o rediseño radical de la receta.`)
                    break
            }
        } else {
            baseInsights.push(`INTELIGENCIA GASTRONÓMICA: Auditando ${items.length} unidades de negocio...`)

            const stars = items.filter((i) => i.classification === 'STAR')
            if (stars.length > 0) {
                baseInsights.push(`OPTIMIZACIÓN: El ${(stars.length / items.length * 100).toFixed(0)}% de tu oferta es altamente eficiente.`)
            }

            const dogs = items.filter((i) => i.classification === 'DOG')
            if (dogs.length > 3) {
                baseInsights.push(`ALERTA: Detectada fatiga en ${dogs.length} platos. Se recomienda limpieza de carta.`)
            }

            const totalRevenue = items.reduce((acc, i) => acc + Number(i.total_sales || 0), 0)
            baseInsights.push(`IMPACTO FINANCIERO: Facturación proyectada de €${totalRevenue.toLocaleString()}.`)
        }

        return baseInsights
    }, [selectedCategory, items])

    // Reset insight index safely when category changes during render
    const [prevCategory, setPrevCategory] = useState(selectedCategory)
    if (selectedCategory !== prevCategory) {
        setPrevCategory(selectedCategory)
        setCurrentInsight(0)
    }

    useEffect(() => {
        if (displayInsights.length === 0) return
        const timer = setInterval(() => {
            setCurrentInsight((prev) => (prev + 1) % displayInsights.length)
        }, 6000)
        return () => clearInterval(timer)
    }, [displayInsights.length])

    return (
        <div className={cn(
            "w-full h-14 rounded-2xl glass-premium flex items-center px-8 mb-8 overflow-hidden relative group transition-all duration-700",
            selectedCategory ? "border-primary/20 shadow-primary/10" : "border-emerald-500/20 shadow-emerald-500/5"
        )}>
            {/* Ambient Background Glow */}
            <div className={cn(
                "absolute inset-0 opacity-10 transition-colors duration-1000",
                selectedCategory ? "bg-primary" : "bg-emerald-500"
            )} />

            <div className="z-10 flex items-center justify-center w-full gap-6">
                <div className="flex-shrink-0">
                    {selectedCategory ? (
                        <Brain className="w-5 h-5 text-primary animate-pulse" />
                    ) : (
                        <Sparkles className="w-5 h-5 text-emerald-500 animate-spin-slow" />
                    )}
                </div>

                <div className="flex-1 max-w-4xl relative h-6 overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={`${selectedCategory}-${currentInsight}`}
                            initial={{ y: 20, opacity: 0, filter: 'blur(10px)' }}
                            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                            exit={{ y: -20, opacity: 0, filter: 'blur(5px)' }}
                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            className={cn(
                                "font-serif italic text-lg font-medium tracking-tight whitespace-nowrap text-center",
                                selectedCategory ? "text-foreground" : "text-emerald-800"
                            )}
                        >
                            {displayInsights[currentInsight] || ""}
                        </motion.p>
                    </AnimatePresence>
                </div>

                <div className="flex-shrink-0 flex gap-1">
                    {displayInsights.map((_, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                "h-1 rounded-full transition-all duration-500",
                                idx === currentInsight ? "w-4 bg-primary" : "w-1 bg-black/10"
                            )}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
