"use client"

import * as React from "react"
import { CalendarIcon, ChevronDown } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { DateRange } from "react-day-picker"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DashboardDatePickerProps {
    className?: string
    date?: DateRange
    setDate?: (date: DateRange | undefined) => void
}

export function DashboardDatePicker({
    className,
    date: externalDate,
    setDate: externalSetDate,
}: DashboardDatePickerProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // Initialize state from URL params or default to current month
    // We utilize a lazy initializer with useState to avoid hydration mismatch from new Date() in useMemo
    const [internalDate, internalSetDate] = React.useState<DateRange | undefined>(() => {
        // This only runs on client if we don't care about SSR for this initial state,
        // BUT for a dashboard we might want SSR. 
        // However, useSearchParams is a client hook.
        // To be safe for hydration, we should ideally rely on props or fixed defaults.
        // But since this logic was here, let's keep it but ensure 'now' is consistent if possible?
        // Actually, useState initializer runs during render too.
        // The safest way is to trust the URL params if present, or use a fixed date for SSR if 'now' is needed,
        // then update to 'now' in useEffect.
        // But here, let's stick to the existing logic but knowing 'initialDate' is only a fallback.
        return undefined
    })

    // Initialization Effect
    React.useEffect(() => {
        const start = searchParams.get("from")
        const end = searchParams.get("to")

        if (start && end) {
            const newFrom = new Date(start)
            const newTo = new Date(end)

            // Check if different to ensure stable identity
            // We use optional chaining and getTime() for safe comparison
            const currentFromTime = internalDate?.from?.getTime()
            const currentToTime = internalDate?.to?.getTime()

            if (currentFromTime !== newFrom.getTime() || currentToTime !== newTo.getTime()) {
                internalSetDate({
                    from: newFrom,
                    to: newTo,
                })
            }
        } else if (!internalDate) {
            // Only set default if not already set (to avoid loop or override)
            const now = new Date()
            internalSetDate({
                from: new Date(now.getFullYear(), now.getMonth(), 1),
                to: now
            })
        }
    }, [searchParams, internalDate])


    const date = externalDate !== undefined ? externalDate : internalDate
    const setDate = externalSetDate !== undefined ? externalSetDate : internalSetDate

    // Update URL when date changes
    // ONLY if internal state is being used (i.e. not controlled by parent)
    // If externalDate is present, the parent (UnifiedDashboard) handles the URL sync.
    React.useEffect(() => {
        if (externalDate) return;

        if (date?.from) {
            const startStr = date.from.toISOString()
            const endStr = date.to ? date.to.toISOString() : undefined

            const currentStart = searchParams.get("from")
            const currentEnd = searchParams.get("to")

            if (startStr !== currentStart || endStr !== currentEnd) {
                const params = new URLSearchParams(searchParams)
                params.set("from", startStr)
                if (endStr) {
                    params.set("to", endStr)
                } else {
                    params.delete("to")
                }
                router.replace(`${pathname}?${params.toString()}`)
            }
        }
    }, [date, pathname, router, searchParams, externalDate])

    // --- Hydration Safe Label Logic ---
    const [smartLabel, setSmartLabel] = React.useState<{ isSmartPeriod: boolean, isCurrentYear: boolean }>({
        isSmartPeriod: false,
        isCurrentYear: false
    })

    React.useEffect(() => {
        if (date?.from && date?.to) {
            const now = new Date()
            const diffTime = Math.abs(date.to.getTime() - date.from.getTime())
            const diffDays = diffTime / (1000 * 60 * 60 * 24)

            const isLast30Days = diffDays > 28 && diffDays < 32 && date.to.getDate() === now.getDate() && date.to.getMonth() === now.getMonth() && date.to.getFullYear() === now.getFullYear()
            const isCurYear = date.from.getFullYear() === now.getFullYear()

            setSmartLabel({
                isSmartPeriod: isLast30Days,
                isCurrentYear: isCurYear
            })
        } else if (date?.from) {
            setSmartLabel({
                isSmartPeriod: false,
                isCurrentYear: date.from.getFullYear() === new Date().getFullYear()
            })
        }
    }, [date])

    const { isSmartPeriod, isCurrentYear } = smartLabel

    // Hydration fix: Only render Radix components after mount
    const [mounted, setMounted] = React.useState(false)
    React.useEffect(() => {
        setMounted(true)
    }, [])

    const triggerButton = (
        <Button
            id="date"
            variant={"outline"}
            className={cn(
                "w-[260px] justify-between text-left font-normal bg-white/50 dark:bg-white/10 backdrop-blur-sm border-slate-200 dark:border-slate-800 hover:bg-white/80 dark:hover:bg-white/20 transition-all cursor-pointer",
                !date && "text-muted-foreground"
            )}
        >
            <div className="flex items-center gap-2">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-1.5 rounded-md text-blue-600 dark:text-blue-400">
                    <CalendarIcon className="h-4 w-4" />
                </div>
                {date?.from ? (
                    date.to ? (
                        <div className="flex flex-col leading-none gap-0.5">
                            {/* Smart Formatting Logic - Client Side Only */}
                            {isSmartPeriod ? (
                                <>
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Últimos 30 días</span>
                                    <span className="text-[10px] text-slate-400 font-medium">Periodo automático</span>
                                </>
                            ) : (
                                <>
                                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                        <span>{format(date.from, "d MMM", { locale: es })}</span>
                                        <span className="text-slate-400">→</span>
                                        <span>{format(date.to, "d MMM", { locale: es })}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400">
                                        {isCurrentYear ? 'Año actual' : date.from.getFullYear()}
                                    </span>
                                </>
                            )}
                        </div>
                    ) : (
                        <span>{format(date.from, "d MMM, y", { locale: es })}</span>
                    )
                ) : (
                    <span>Selecciona periodo</span>
                )}
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
        </Button>
    )

    return (
        <div className={cn("grid gap-2", className)}>
            {!mounted ? (
                triggerButton
            ) : (
                <Popover>
                    <PopoverTrigger asChild>
                        {triggerButton}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            initialFocus
                            mode="range"
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={2}
                            locale={es}
                        />
                    </PopoverContent>
                </Popover>
            )}
        </div>
    )
}
