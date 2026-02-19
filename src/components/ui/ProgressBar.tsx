'use client'

interface ProgressBarProps {
    value: number
    target: number
    label?: string
    showPercentage?: boolean
    /** 'good' = green when low, 'bad' = red when low */
    direction?: 'lower-is-better' | 'higher-is-better'
    size?: 'sm' | 'md'
}

export function ProgressBar({
    value,
    target,
    label,
    showPercentage = true,
    direction = 'lower-is-better',
    size = 'md'
}: ProgressBarProps) {
    const percentage = Math.min((value / target) * 100, 120) // Cap at 120% for visual
    const isGood = direction === 'lower-is-better' ? value <= target : value >= target

    const barColor = isGood
        ? 'bg-emerald-500'
        : percentage > 100
            ? 'bg-red-500'
            : 'bg-amber-500'

    const heightClass = size === 'sm' ? 'h-1' : 'h-1.5'

    return (
        <div className="space-y-1">
            {(label || showPercentage) && (
                <div className="flex items-baseline justify-between">
                    {label && (
                        <span className="text-xs text-slate-500">{label}</span>
                    )}
                    {showPercentage && (
                        <span className={`text-xs font-medium ${isGood ? 'text-emerald-600' : 'text-slate-600'}`}>
                            {Math.round(percentage)}% del objetivo
                        </span>
                    )}
                </div>
            )}
            <div className={`w-full bg-slate-100 dark:bg-slate-800 rounded-full ${heightClass} overflow-hidden`}>
                <div
                    className={`${barColor} ${heightClass} rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>
            {/* Target marker */}
            <div className="flex justify-between text-[10px] text-slate-400">
                <span>0</span>
                <span>Objetivo: {target}%</span>
            </div>
        </div>
    )
}
