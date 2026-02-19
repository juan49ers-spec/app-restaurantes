"use client"

import { Badge } from "@/components/ui/badge"
import { Activity, Brain, Star, X, AlertOctagon, LucideIcon, Lightbulb } from "lucide-react"
import { useMenuEngineering } from "./MenuEngineeringContext"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useRef, useState } from "react"

interface MenuItem {
    id: string
    classification?: 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG'
    total_sales?: number | string
    quantity_sold?: number | string
    contribution_margin?: number | string
    recipe?: {
        name: string
    }
    price?: number | string
}

interface Props {
    items: MenuItem[]
}

const config: Record<string, {
    color: string,
    bgColor: string,
    borderColor: string,
    icon: LucideIcon,
    desc: string,
    advice: string[],
    neuroTip: string
}> = {
    STAR: {
        color: "text-emerald-600",
        bgColor: "bg-emerald-50/50",
        borderColor: "border-emerald-500/30",
        icon: Star,
        desc: "Tus mejores platos. Se venden mucho y dejan mucho dinero. ¡Cuídalos!",
        advice: [
            "Mantener calidad rigurosa",
            "Promover en zonas 'calientes'",
            "Probar subida leve de precio"
        ],
        neuroTip: "Efecto Señuelo: Añade un 'Súper Premium' al lado para que este parezca barato."
    },
    PLOWHORSE: {
        color: "text-amber-600",
        bgColor: "bg-amber-50/50",
        borderColor: "border-amber-500/30",
        icon: Activity,
        desc: "Se venden muchísimo pero ganas poco. Sube el precio o baja el coste.",
        advice: [
            "Reducir gramaje de proteína",
            "Renegociar coste ingredientes",
            "Crear combos con bebidas"
        ],
        neuroTip: "Ingeniería de Precios: Termina el precio en .95 o .99 para reducir la percepción de coste."
    },
    PUZZLE: {
        color: "text-violet-600",
        bgColor: "bg-violet-50/50",
        borderColor: "border-violet-500/30",
        icon: Brain,
        desc: "Ganas mucho dinero pero se venden poco. ¡Hazlos más visibles!",
        advice: [
            "Mejorar fotografía del plato",
            "Cambiar el nombre a algo evocador",
            "Mover a la esquina superior derecha"
        ],
        neuroTip: "Triángulo de Oro: La vista va primero a la esquina superior derecha. Pon este plato ahí."
    },
    DOG: {
        color: "text-rose-600",
        bgColor: "bg-rose-50/50",
        borderColor: "border-rose-500/30",
        icon: AlertOctagon,
        desc: "Ni se venden ni dan dinero. Considera quitarlos de la carta.",
        advice: [
            "Eliminar de la carta",
            "Reinventar totalmente",
            "Mantener solo si es esencial (niños)"
        ],
        neuroTip: "Paradoja de la Elección: Eliminar opciones malas aumenta las ventas de las buenas."
    }
}

const StrategyCard = ({ title, items, type, className, index }: { title: string, items: MenuItem[], type: 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG', className?: string, index: number }) => {
    const { hoveredCategory, setHoveredCategory, selectedCategory, setSelectedCategory } = useMenuEngineering()
    const divRef = useRef<HTMLDivElement>(null)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [opacity, setOpacity] = useState(0)

    const theme = config[type]
    const Icon = theme.icon

    // Calc revenue share
    const totalRevenue = items.reduce((acc, i) => acc + Number(i.total_sales || 0), 0)
    const categoryRevenue = items.filter(i => i.classification === type).reduce((acc, i) => acc + Number(i.total_sales || 0), 0)
    const revenueShare = totalRevenue > 0 ? ((categoryRevenue / totalRevenue) * 100).toFixed(1) : "0"

    const topItems = items
        .filter(i => i.classification === type)
        .sort((a, b) => Number(b.quantity_sold) - Number(a.quantity_sold))
        .slice(0, 3)

    const isHovered = hoveredCategory === type
    const isSelected = selectedCategory === type
    const isDimmed = (selectedCategory !== null && !isSelected) || (hoveredCategory !== null && !isHovered && selectedCategory === null)

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!divRef.current) return
        const div = divRef.current
        const rect = div.getBoundingClientRect()
        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }

    const handleMouseEnter = () => {
        setOpacity(1)
        if (!selectedCategory) setHoveredCategory(type)
    }

    const handleMouseLeave = () => {
        setOpacity(0)
        if (!selectedCategory) setHoveredCategory(null)
    }

    // Color extraction for Spotlight
    const spotlightColor = type === 'STAR' ? '16, 185, 129' :
        type === 'PLOWHORSE' ? '245, 158, 11' :
            type === 'PUZZLE' ? '124, 58, 237' :
                '225, 29, 72';

    return (
        <motion.div
            ref={divRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
                opacity: isDimmed ? 0.4 : 1,
                scale: isSelected ? 1.02 : isHovered ? 1.01 : 1,
                y: isSelected || isHovered ? -4 : 0
            }}
            transition={{ duration: 0.5, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={cn(
                "glass-card relative h-full flex flex-col group overflow-hidden cursor-pointer p-6 rounded-2xl border-white/40 shadow-sm",
                isSelected && `ring-2 ring-offset-2 ${theme.borderColor.replace('border-', 'ring-')}`,
                className
            )}
            onClick={() => setSelectedCategory(isSelected ? null : type)}
        >
            {/* Spotlight Effect */}
            <div
                style={{
                    '--opacity': opacity,
                    '--spotlight': `radial-gradient(400px circle at ${position.x}px ${position.y}px, rgba(${spotlightColor}, 0.15), transparent 40%)`
                } as React.CSSProperties}
                className={cn(
                    "pointer-events-none absolute -inset-px transition duration-500 group-hover:opacity-100",
                    "opacity-[var(--opacity)] bg-[var(--spotlight)]"
                )}
            />

            {/* Selection Indicator */}
            <AnimatePresence>
                {isSelected && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0, rotate: -45 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0, opacity: 0, rotate: 45 }}
                        className={cn("absolute top-3 right-3 p-1.5 rounded-full z-20 shadow-lg", theme.bgColor, theme.color)}
                    >
                        <X className="w-3.5 h-3.5" />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative z-10 flex flex-col h-full font-sans">
                <div className="flex justify-between items-start mb-6">
                    <div className={cn("p-3 rounded-xl transition-all duration-500 group-hover:shadow-lg", theme.bgColor, theme.color)}>
                        <Icon className="h-6 w-6" />
                    </div>
                    <Badge variant="secondary" className="font-mono text-[10px] tracking-wider uppercase bg-white/40 backdrop-blur-md px-2 py-0.5 border-none">
                        {items.filter(i => i.classification === type).length} PLATOS
                    </Badge>
                </div>

                <div className="mb-6">
                    <h3 className={cn("font-serif text-2xl font-bold mb-2 tracking-tight transition-colors duration-300", theme.color)}>
                        {title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors">
                        {theme.desc}
                    </p>
                </div>

                <div className="flex items-center gap-2 mb-8 p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-white/10">
                    <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        Cuota Ingresos: <span className="text-foreground font-bold">{revenueShare}%</span>
                    </span>
                </div>

                <div className="space-y-4 flex-grow">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <span className={cn("w-1 h-3 rounded-full", theme.color.replace('text-', 'bg-'))}></span>
                        Estrategia Sugerida
                    </div>
                    <ul className="space-y-3">
                        {theme.advice.map((line, idx) => (
                            <li key={idx} className="text-xs text-muted-foreground group-hover:text-foreground flex items-start gap-3 transition-colors">
                                <span className={cn("mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0", theme.color.replace('text-', 'bg-'), "animate-pulse")} />
                                <span className="leading-snug italic font-medium">{line}</span>
                            </li>
                        ))}
                    </ul>

                    {/* Neuro Tip */}
                    <div className={cn(
                        "mt-4 p-3 rounded-xl border border-dashed text-xs leading-relaxed font-medium flex gap-2 items-start",
                        theme.bgColor.replace('/50', '/30'),
                        theme.borderColor
                    )}>
                        <Lightbulb className={cn("w-4 h-4 flex-shrink-0 mt-0.5", theme.color)} />
                        <span className="opacity-80">
                            <strong className={theme.color}>Neuro-Tip:</strong> {theme.neuroTip}
                        </span>
                    </div>
                </div>

                {topItems.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-white/20">
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3">Héroes de Ventas</div>
                        <div className="space-y-2">
                            {topItems.map((item) => (
                                <div key={item.id} className="flex justify-between items-center text-xs group/item p-2 hover:bg-white/40 rounded-lg transition-all">
                                    <span className="text-muted-foreground font-semibold truncate max-w-[150px] group-hover/item:text-foreground">
                                        {item.recipe?.name || "Plato sin nombre"}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-muted-foreground/60">{Number(item.quantity_sold)} ud.</span>
                                        <span className="font-mono font-bold text-primary">
                                            €{Number(item.contribution_margin).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    )
}

export function StrategyCards({ items }: Props) {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 auto-rows-fr">
            <StrategyCard index={0} title="Estrellas" items={items} type="STAR" />
            <StrategyCard index={1} title="Vacas" items={items} type="PLOWHORSE" />
            <StrategyCard index={2} title="Enigmas" items={items} type="PUZZLE" />
            <StrategyCard index={3} title="Perros" items={items} type="DOG" />
        </div>
    )
}
