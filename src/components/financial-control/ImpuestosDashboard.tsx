"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { TaxPulseWidget } from "./TaxPulseWidget"
import { IVATable } from "./IVATable"
import { IRPTable } from "./IRPTable"
import { FiscalCalendar } from "./FiscalCalendar"
import { DocumentChecklist } from "./DocumentChecklist"
import { Download, ChevronLeft, ChevronRight, FileText, Loader2 } from "lucide-react"
import { getQuarterlyFiscalData, QuarterlyFiscalData } from "@/app/actions/financial-control"

interface ImpuestosDashboardProps {
    restaurantId: string;
}

export function ImpuestosDashboard({ restaurantId }: ImpuestosDashboardProps) {
    const [date, setDate] = useState(() => new Date())
    const [data, setData] = useState<QuarterlyFiscalData | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Derived state for year and quarter to ensure consistency
    const year = date.getFullYear()
    const currentMonth = date.getMonth()
    const quarterNum = Math.floor(currentMonth / 3) + 1
    const quarter = `Q${quarterNum}` as 'Q1' | 'Q2' | 'Q3' | 'Q4'

    useEffect(() => {
        let isMounted = true;
        getQuarterlyFiscalData(restaurantId, year, quarterNum)
            .then(res => {
                if (isMounted) {
                    setData(res)
                }
            })
            .catch(err => {
                console.error("Failed to load fiscal data:", err)
            })
            .finally(() => {
                if (isMounted) setIsLoading(false)
            });

        return () => { isMounted = false }
    }, [restaurantId, year, quarterNum])

    const handlePeriodChange = (direction: 'prev' | 'next') => {
        setIsLoading(true)
        setDate(prev => {
            const newDate = new Date(prev)
            if (direction === 'prev') {
                newDate.setMonth(newDate.getMonth() - 3)
            } else {
                newDate.setMonth(newDate.getMonth() + 3)
            }
            return newDate
        })
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] gap-4">
                <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
                <p className="text-sm text-neutral-500">Cargando datos fiscales...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Obligaciones Fiscales</h2>
                        <p className="text-sm text-neutral-500 mt-1">Gestión y control de tributos trimestrales</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white rounded-lg border border-neutral-200 p-1 shadow-sm">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-neutral-100 rounded-md"
                            onClick={() => handlePeriodChange('prev')}
                        >
                            <ChevronLeft className="h-4 w-4 text-neutral-600" />
                        </Button>
                        <div className="px-4 text-center">
                            <span className="text-sm font-bold text-neutral-900 block leading-none">{quarter}</span>
                            <span className="text-[10px] font-medium text-neutral-500 block leading-none mt-0.5">{year}</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-neutral-100 rounded-md"
                            onClick={() => handlePeriodChange('next')}
                        >
                            <ChevronRight className="h-4 w-4 text-neutral-600" />
                        </Button>
                    </div>

                    <Button variant="outline" size="sm" className="gap-2 text-xs font-semibold h-9 bg-white shadow-sm border-neutral-200 hover:bg-neutral-50 hover:text-neutral-900">
                        <Download className="w-3.5 h-3.5" />
                        Exportar
                    </Button>
                </div>
            </div>

            {/* Row 1: Pulse Widget (Full Width) */}
            <TaxPulseWidget
                ivaBalance={data?.pulseData?.ivaBalance || 0}
                irpfTotal={data?.pulseData?.irpfTotal || 0}
                daysRemaining={data?.pulseData?.daysRemaining || 0}
                quarter={quarter}
                year={year}
            />

            {/* Row 2: Detail Tables (2 Columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-[420px]">
                    <IVATable year={year} quarter={quarter} data={data?.ivaByMonth || []} />
                </div>
                <div className="h-[420px]">
                    <IRPTable year={year} quarter={quarter} data={data?.irpfByConcept || []} />
                </div>
            </div>

            {/* Row 3: Tools & Calendar (2 Columns - 50/50 Split) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-full min-h-[200px]">
                    <DocumentChecklist quarter={quarter} />
                </div>
                <div className="h-full min-h-[200px]">
                    <FiscalCalendar year={year} quarter={quarter} />
                </div>
            </div>

            {/* Footer info */}
            <div className="flex items-center justify-center gap-2 py-4">
                <FileText className="w-3.5 h-3.5 text-neutral-400" />
                <p className="text-xs text-neutral-400 text-center">
                    Los cálculos son estimaciones basadas en la información registrada. Consulta siempre con tu asesor fiscal.
                </p>
            </div>
        </div>
    )
}
