'use client'

import { Lightbulb, CheckCircle } from "lucide-react"
import { Tooltip } from "@/components/ui/Tooltip"

export interface AISuggestion {
    id: string
    category: 'staff' | 'menu' | 'inventory' | 'costs'
    title: string
    impact: number
    priority: 'high' | 'medium' | 'low'
}

interface AISuggestionsPanelProps {
    suggestions: AISuggestion[]
    onActionClick?: (id: string) => void
}

export function generateMockSuggestions(): AISuggestion[] {
    return [
        { id: '1', category: 'staff', title: 'Reducir 1 persona martes cena', impact: 180, priority: 'high' },
        { id: '2', category: 'menu', title: 'Subir precio "Ensalada César"', impact: 120, priority: 'medium' },
        { id: '3', category: 'inventory', title: 'Reducir stock de salmón', impact: 80, priority: 'low' },
    ]
}

export function AISuggestionsPanel({ suggestions, onActionClick }: AISuggestionsPanelProps) {
    const sorted = [...suggestions].sort((a, b) => b.impact - a.impact)

    // Empty = all good
    if (!suggestions || suggestions.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                        Sugerencias IA
                    </span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 rounded p-2">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <p className="text-xs font-medium">Sin acciones pendientes</p>
                </div>
            </div>
        )
    }

    const priorityDot: Record<string, string> = {
        high: 'bg-red-500',
        medium: 'bg-amber-500',
        low: 'bg-slate-400'
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Sugerencias IA
                </span>
                <Tooltip content="Acciones recomendadas basadas en el análisis de tus datos." asIcon />
            </div>

            <ul className="space-y-3">
                {sorted.slice(0, 4).map((s) => (
                    <li
                        key={s.id}
                        className="flex items-start gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-md transition-colors cursor-pointer group"
                        onClick={() => onActionClick?.(s.id)}
                    >
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${priorityDot[s.priority]}`} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate transition-colors">
                                {s.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">
                                    +{s.impact}€/mes
                                </span>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
}
