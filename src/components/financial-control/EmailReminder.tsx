"use client"

import { useState } from "react"
import { Bell, ChevronDown, ChevronUp, Check } from "lucide-react"

interface EmailReminderProps {
    currentEmail?: string
}

export function EmailReminder({ currentEmail }: EmailReminderProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [email, setEmail] = useState(currentEmail || '')
    const [isSubscribed, setIsSubscribed] = useState(false)

    const handleSubscribe = (e: React.FormEvent) => {
        e.preventDefault()
        if (email) {
            setIsSubscribed(true)
            setIsExpanded(false)
        }
    }

    if (isSubscribed) {
        return (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 rounded-lg">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-emerald-900 truncate">Recordatorios activos</p>
                        <p className="text-[10px] text-emerald-700 truncate">{email}</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-3 flex items-center justify-between hover:bg-neutral-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-50 rounded-lg">
                        <Bell className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <span className="text-xs font-bold text-neutral-900">Recordatorios email</span>
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
                ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                )}
            </button>

            {isExpanded && (
                <div className="px-3 pb-3 border-t border-neutral-100">
                    <form onSubmit={handleSubscribe} className="pt-3 space-y-2">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tu@email.com"
                            className="w-full px-2 py-1.5 border border-neutral-200 rounded text-xs"
                            required
                        />
                        <p className="text-[9px] text-neutral-500">
                            Te avisaremos 15, 7 y 3 días antes del cierre
                        </p>
                        <button
                            type="submit"
                            className="w-full px-3 py-1.5 bg-neutral-900 text-white rounded text-xs font-bold hover:bg-neutral-800"
                        >
                            Activar
                        </button>
                    </form>
                </div>
            )}
        </div>
    )
}
