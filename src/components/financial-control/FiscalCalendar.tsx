"use client"

import { Calendar as CalendarIcon, Clock } from "lucide-react"

interface FiscalCalendarProps {
    year: number
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
}

export function FiscalCalendar({ year, quarter }: FiscalCalendarProps) {
    // Calculate quarter dates
    const quarterNum = parseInt(quarter[1])
    const startMonth = (quarterNum - 1) * 3 // 0, 3, 6, 9
    const endMonth = startMonth + 2

    // Quarter start and end dates
    const quarterStart = new Date(year, startMonth, 1)
    const quarterEnd = new Date(year, endMonth + 1, 0)

    // Calculate current progress
    const now = new Date()
    // Clamp now between start and end for visualization
    const clampedNow = new Date(Math.max(quarterStart.getTime(), Math.min(now.getTime(), quarterEnd.getTime())))

    const totalDays = Math.ceil((quarterEnd.getTime() - quarterStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const daysPassed = Math.ceil((clampedNow.getTime() - quarterStart.getTime()) / (1000 * 60 * 60 * 24))
    const progress = (daysPassed / totalDays) * 100

    // Month names
    const months: string[] = []
    for (let i = 0; i < 3; i++) {
        const date = new Date(year, startMonth + i, 1)
        const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(date)
        months.push(monthName.charAt(0).toUpperCase() + monthName.slice(1))
    }

    return (
        <div className="bg-white rounded-xl border border-neutral-200 p-5 h-full flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-neutral-100 rounded-md">
                    <CalendarIcon className="w-3.5 h-3.5 text-neutral-600" />
                </div>
                <div>
                    <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">Calendario Fiscal</h3>
                    <p className="text-[10px] text-neutral-500">{quarter} {year}</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="relative pt-2">
                    <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-neutral-900 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Month Markers */}
                    <div className="flex justify-between mt-2">
                        {months.map((month, idx) => (
                            <div key={idx} className="flex flex-col items-center">
                                <div className="w-1 h-1 bg-neutral-300 rounded-full mb-1" />
                                <span className="text-[10px] uppercase font-bold text-neutral-400">{month}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-neutral-400" />
                        <span className="text-xs text-neutral-600 font-medium">Progreso del trimestre</span>
                    </div>
                    <span className="text-sm font-bold text-neutral-900">{Math.round(progress)}%</span>
                </div>
            </div>
        </div>
    )
}
