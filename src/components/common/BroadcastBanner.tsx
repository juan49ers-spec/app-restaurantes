'use client'

import { useState, useEffect } from 'react'
import { Megaphone, X, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Broadcast {
    id: string
    title: string
    content: string
    severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS'
}

interface Props {
    broadcasts: Broadcast[]
}

export function BroadcastBanner({ broadcasts }: Props) {
    const [activeBroadcasts, setActiveBroadcasts] = useState<Broadcast[]>([])
    const [dismissedIds, setDismissedIds] = useState<string[]>([])

    useEffect(() => {
        const stored = localStorage.getItem('dismissed_broadcasts')
        if (stored) {
            try {
                setDismissedIds(JSON.parse(stored))
            } catch (e) {
                console.error('Error parsing dismissed broadcasts', e)
            }
        }
        setActiveBroadcasts(broadcasts)
    }, [broadcasts])

    const handleDismiss = (id: string) => {
        const newDismissed = [...dismissedIds, id]
        setDismissedIds(newDismissed)
        localStorage.setItem('dismissed_broadcasts', JSON.stringify(newDismissed))
    }

    const visibleBroadcasts = activeBroadcasts.filter(b => !dismissedIds.includes(b.id))

    if (visibleBroadcasts.length === 0) return null

    return (
        <div className="w-full space-y-px">
            {visibleBroadcasts.map((b) => (
                <div
                    key={b.id}
                    className={cn(
                        "relative w-full px-4 py-3 flex items-center justify-center gap-3 animate-in slide-in-from-top duration-300",
                        b.severity === 'CRITICAL' && "bg-red-500 text-white",
                        b.severity === 'WARNING' && "bg-amber-500 text-black",
                        b.severity === 'SUCCESS' && "bg-emerald-500 text-white",
                        b.severity === 'INFO' && "bg-blue-600 text-white"
                    )}
                >
                    <div className="flex items-center gap-2 max-w-4xl mx-auto px-8 text-center text-sm font-medium">
                        {b.severity === 'CRITICAL' || b.severity === 'WARNING' ? <AlertCircle className="w-4 h-4 shrink-0" /> : null}
                        {b.severity === 'SUCCESS' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : null}
                        {b.severity === 'INFO' ? <Info className="w-4 h-4 shrink-0" /> : null}

                        <span>
                            <strong className="mr-2">{b.title}:</strong>
                            {b.content}
                        </span>
                    </div>

                    <button
                        onClick={() => handleDismiss(b.id)}
                        className="absolute right-4 p-1 rounded-full hover:bg-black/10 transition-colors"
                        aria-label="Cerrar anuncio"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    )
}
