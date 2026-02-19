'use client'

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TooltipProps {
    content: string
    children?: React.ReactNode
    /** Show as icon button (?) instead of wrapping children */
    asIcon?: boolean
    className?: string
}

export function Tooltip({ content, children, asIcon = false, className }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false)

    if (asIcon) {
        return (
            <span className={cn("relative inline-block", className)}>
                <button
                    type="button"
                    onMouseEnter={() => setIsVisible(true)}
                    onMouseLeave={() => setIsVisible(false)}
                    onFocus={() => setIsVisible(true)}
                    onBlur={() => setIsVisible(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    aria-label="Más información"
                >
                    <HelpCircle className="w-3.5 h-3.5" />
                </button>
                {isVisible && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
                        <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs px-3 py-2 rounded-lg shadow-lg max-w-xs whitespace-normal">
                            {content}
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-100" />
                    </div>
                )}
            </span>
        )
    }

    return (
        <span
            className="relative inline-block"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
                    <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs px-3 py-2 rounded-lg shadow-lg max-w-xs whitespace-normal">
                        {content}
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-100" />
                </div>
            )}
        </span>
    )
}
