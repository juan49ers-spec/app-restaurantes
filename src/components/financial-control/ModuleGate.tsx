'use client'

import { ReactNode } from 'react'
import { Lock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface ModuleGateProps {
    children?: ReactNode
    currentLevel?: 'none' | 'basic' | 'premium'
    requiredLevel: 'basic' | 'premium'
    title?: string
    description?: string
    moduleName?: string // "Financial Control" or "Menu Engineering"
}

export function ModuleGate({
    children,
    currentLevel = 'basic', // Default to basic if undefined (safe fallback)
    requiredLevel,
    title = "Función Premium",
    description = "Mejora tu plan para acceder a este módulo avanzado.",
    moduleName = "Módulo Premium"
}: ModuleGateProps) {

    const levels = ['none', 'basic', 'premium']
    const currentIdx = levels.indexOf(currentLevel)
    const requiredIdx = levels.indexOf(requiredLevel)

    const hasAccess = currentIdx >= requiredIdx

    if (hasAccess) {
        return <>{children}</>
    }

    return (
        <div className="relative w-full h-full min-h-[300px] overflow-hidden rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
            {/* Blurry content background implication */}
            <div className="absolute inset-0 pattern-grid-lg opacity-5 pointer-events-none" />

            <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px]">
                <Card className="w-full max-w-md p-8 text-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-slate-200/60 shadow-2xl relative overflow-hidden group">

                    {/* Premium Glow Effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-amber-500/20 blur-xl group-hover:opacity-100 opacity-50 transition-opacity duration-1000 animate-pulse" />

                    <div className="relative z-10 flex flex-col items-center gap-4">
                        <div className="h-16 w-16 bg-gradient-to-br from-amber-100 to-purple-50 dark:from-amber-900/40 dark:to-purple-900/40 rounded-full flex items-center justify-center shadow-inner border border-white/50">
                            <Lock className="h-8 w-8 text-amber-500/80" />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-purple-600 dark:from-amber-400 dark:to-purple-400">
                                {title}
                            </h3>
                            <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
                                {description}
                            </p>
                        </div>

                        <div className="pt-4 w-full">
                            <Button className="w-full bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-600 hover:to-purple-700 text-white shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                                <Sparkles className="w-4 h-4 mr-2" />
                                Desbloquear {moduleName}
                            </Button>
                            <p className="text-[10px] text-muted-foreground mt-3">
                                Requiere plan <strong>{requiredLevel.toUpperCase()}</strong> o superior
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}
