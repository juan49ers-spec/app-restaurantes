'use client'

import { Lightbulb, TrendingUp, AlertTriangle, Zap } from 'lucide-react'

export interface AIInsightProps {
    insight: string
    context: string
    type: 'opportunity' | 'warning' | 'action' | 'info'
    actionLabel?: string
    onAction?: () => void
    insightId?: string
    estimatedImpact?: number
    compact?: boolean
}

const TYPE_CONFIG = {
    opportunity: {
        icon: TrendingUp,
        accent: 'text-emerald-600',
        border: 'border-l-emerald-500',
    },
    warning: {
        icon: AlertTriangle,
        accent: 'text-amber-600',
        border: 'border-l-amber-500',
    },
    action: {
        icon: Zap,
        accent: 'text-blue-600',
        border: 'border-l-blue-500',
    },
    info: {
        icon: Lightbulb,
        accent: 'text-slate-500',
        border: 'border-l-slate-400',
    }
}

export function AIInsight({
    insight,
    context,
    type,
    actionLabel,
    onAction,
    insightId,
    estimatedImpact,
    compact = false
}: AIInsightProps) {
    const config = TYPE_CONFIG[type]
    const Icon = config.icon

    if (compact) {
        return (
            <div
                className={`flex items-center gap-2 text-xs py-1.5`}
                data-insight-id={insightId}
            >
                <Icon className={`w-3 h-3 ${config.accent}`} />
                <span className="text-slate-600 dark:text-slate-400">{insight}</span>
                {estimatedImpact && (
                    <span className="font-medium text-emerald-600">+{estimatedImpact}€</span>
                )}
            </div>
        )
    }

    return (
        <div
            className={`border-l-4 ${config.border} bg-slate-50 dark:bg-slate-800/50 py-3 px-4`}
            data-insight-id={insightId}
        >
            <div className="flex items-start gap-3">
                <Icon className={`w-4 h-4 mt-0.5 ${config.accent} flex-shrink-0`} />

                <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                        {context}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {insight}
                    </p>

                    {(estimatedImpact || actionLabel) && (
                        <div className="flex items-center justify-between mt-3">
                            {estimatedImpact && (
                                <span className="text-sm font-semibold text-emerald-600">
                                    +{estimatedImpact}€/mes
                                </span>
                            )}
                            {actionLabel && onAction && (
                                <button
                                    onClick={onAction}
                                    className="text-xs font-medium text-slate-900 dark:text-slate-100 underline underline-offset-2 hover:no-underline"
                                >
                                    {actionLabel} →
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
