'use client'

import { FileQuestion, TrendingUp, Users, DollarSign } from 'lucide-react'

interface EmptyStateProps {
    type: 'no-data' | 'empty-good' | 'connect' | 'loading'
    title: string
    description?: string
    actionLabel?: string
    onAction?: () => void
    icon?: 'ghost' | 'chart' | 'users' | 'money'
}

const ICONS = {
    ghost: FileQuestion,
    chart: TrendingUp,
    users: Users,
    money: DollarSign,
}

export function EmptyState({
    type,
    title,
    description,
    actionLabel,
    onAction,
    icon = 'chart'
}: EmptyStateProps) {
    const Icon = ICONS[icon]

    const bgColor = type === 'empty-good'
        ? 'bg-emerald-50 dark:bg-emerald-900/20'
        : 'bg-slate-50 dark:bg-slate-800/50'

    const iconColor = type === 'empty-good'
        ? 'text-emerald-500'
        : 'text-slate-300 dark:text-slate-600'

    return (
        <div className={`${bgColor} rounded-lg py-8 px-4 text-center`}>
            <Icon className={`w-8 h-8 mx-auto mb-3 ${iconColor}`} />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {title}
            </p>
            {description && (
                <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">
                    {description}
                </p>
            )}
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="mt-4 text-xs font-medium text-slate-900 dark:text-slate-100 underline underline-offset-2 hover:no-underline"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    )
}

// Skeleton loader for loading states
export function CardSkeleton() {
    return (
        <div className="animate-pulse space-y-3 p-4">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
            <div className="space-y-2">
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-4/5" />
            </div>
        </div>
    )
}
