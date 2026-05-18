'use client'

import { useState } from 'react'
import { SCENARIOS } from '@/lib/tour-scenarios'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Wand2, Clock, BarChart3, ChevronRight, PlayCircle, BookOpen, Utensils, PackageCheck, ChefHat, Compass } from "lucide-react"
import { cn } from "@/lib/utils"

interface GuideSelectorProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelectScenario: (id: string) => void
}

export function GuideSelector({ open, onOpenChange, onSelectScenario }: GuideSelectorProps) {
    const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all')

    const categories = ['all', 'Onboarding', 'Gestión Diaria', 'Optimización']

    const filteredScenarios = selectedCategory === 'all'
        ? SCENARIOS
        : SCENARIOS.filter(s => s.category === selectedCategory)

    const getDifficultyColor = (diff: string) => {
        switch (diff) {
            case 'Básico': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
            case 'Intermedio': return 'bg-amber-100 text-amber-700 border-amber-200'
            case 'Avanzado': return 'bg-purple-100 text-purple-700 border-purple-200'
            default: return 'bg-slate-100'
        }
    }

    const getIcon = (iconName: string) => {
        switch (iconName) {
            case 'Utensils': return <Utensils className="w-5 h-5 text-slate-500 group-hover:text-primary transition-colors" />
            case 'PackageCheck': return <PackageCheck className="w-5 h-5 text-slate-500 group-hover:text-primary transition-colors" />
            case 'BarChart3': return <BarChart3 className="w-5 h-5 text-slate-500 group-hover:text-primary transition-colors" />
            case 'ChefHat': return <ChefHat className="w-5 h-5 text-slate-500 group-hover:text-primary transition-colors" />
            case 'Compass': return <Compass className="w-5 h-5 text-slate-500 group-hover:text-primary transition-colors" />
            default: return <BookOpen className="w-5 h-5 text-slate-500 group-hover:text-primary transition-colors" />
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white/95 backdrop-blur-xl border-white/20 shadow-2xl">
                <div className="flex flex-col md:flex-row h-[600px]">
                    {/* Sidebar */}
                    <div className="w-full md:w-64 bg-slate-50/50 border-r border-slate-100 p-6 flex flex-col gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Wand2 className="w-5 h-5 text-primary" />
                                <h2 className="font-serif text-xl font-bold text-slate-800">ControlHub <span className="text-primary italic">Academy</span></h2>
                            </div>
                            <p className="text-xs text-muted-foreground">Domina tu restaurante paso a paso.</p>
                        </div>

                        <div className="space-y-1">
                            {categories.map(cat => (
                                <Button
                                    key={cat}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedCategory(cat)}
                                    className={cn(
                                        "w-full justify-start text-sm capitalize",
                                        selectedCategory === cat
                                            ? "bg-primary/10 text-primary font-medium"
                                            : "text-slate-600 hover:bg-slate-100"
                                    )}
                                >
                                    {cat === 'all' ? 'Ver Todo' : cat}
                                </Button>
                            ))}
                        </div>

                        <div className="mt-auto bg-primary/5 rounded-xl p-4 border border-primary/10">
                            <h4 className="font-serif font-bold text-primary mb-1">¿Necesitas ayuda?</h4>
                            <p className="text-xs text-muted-foreground mb-3">Contacta con soporte para una formación personalizada.</p>
                            <Button size="sm" variant="outline" className="w-full text-xs h-8 border-primary/20 hover:bg-primary/5">
                                Contactar Soporte
                            </Button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col min-h-0 bg-white/50">
                        <DialogHeader className="p-6 pb-2 border-b border-slate-100">
                            <DialogTitle className="font-serif text-2xl">Guías Interactivas</DialogTitle>
                            <DialogDescription>
                                Selecciona una guía para iniciar el tour interactivo.
                            </DialogDescription>
                        </DialogHeader>

                        <ScrollArea className="flex-1 p-6">
                            <div className="grid grid-cols-1 gap-4">
                                {filteredScenarios.map((scenario) => (
                                    <div
                                        key={scenario.id}
                                        onClick={() => onSelectScenario(scenario.id)}
                                        className="group relative bg-white border border-slate-200 rounded-xl p-5 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                        <div className="flex gap-4 relative z-10">
                                            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform duration-300 group-hover:border-primary/20 group-hover:bg-primary/5">
                                                {getIcon(scenario.icon)}
                                            </div>

                                            <div className="flex-1 space-y-2">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-bold text-slate-800 group-hover:text-primary transition-colors flex items-center gap-2">
                                                            {scenario.title}
                                                            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300 text-primary" />
                                                        </h3>
                                                        <p className="text-sm text-slate-500 line-clamp-2 mt-1">
                                                            {scenario.description}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 pt-2">
                                                    <Badge variant="outline" className={cn("text-[10px] px-2 py-0 h-5 font-normal", getDifficultyColor(scenario.difficulty))}>
                                                        {scenario.difficulty}
                                                    </Badge>
                                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                                        <Clock className="w-3 h-3" />
                                                        {scenario.duration}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center self-center">
                                                <Button size="icon" variant="ghost" className="rounded-full h-8 w-8 text-slate-300 group-hover:text-primary group-hover:bg-primary/10">
                                                    <PlayCircle className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
