"use client"

import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface TaxDeadlineAlertProps {
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
    year: number
    daysRemaining: number
}

export function TaxDeadlineAlert({ quarter, year, daysRemaining }: TaxDeadlineAlertProps) {
    // Funciones de cálculo de fechas límite
    function calculateIVADeadline(currentYear: number) {
        // IVA trimestral: 20 de enero del año siguiente
        const nextYear = currentYear + 1
        return new Date(nextYear, 0, 1) // 20 de enero
    }

    function calculateIRPFDeadline(currentYear: number) {
        // IRPF siempre es día 20 de enero (mismo año)
        return new Date(currentYear, 0, 20)
    }
    
    const ivaDeadline = calculateIVADeadline(year)
    const ivaDeadlineFormatted = new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    }).format(ivaDeadline)
    
    const irpfDeadline = calculateIRPFDeadline(year)
    const irpfDeadlineFormatted = new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    }).format(irpfDeadline)
    
    // Determinar nivel de urgencia
    const getUrgency = () => {
        if (daysRemaining <= 3) return { level: 'critical', color: 'rose', icon: AlertTriangle }
        if (daysRemaining <= 10) return { level: 'warning', color: 'amber', icon: Clock }
        if (daysRemaining <= 20) return { level: 'notice', color: 'blue', icon: CheckCircle2 }
        return { level: 'ok', color: 'emerald', icon: CheckCircle2 }
    }
    
    const urgency = getUrgency()
    const Icon = urgency.icon
    
    // Mensajes específicos por trimestre
    const q1Messages: Record<string, string> = {
        critical: `¡URGENTE! Quedan ${daysRemaining} días. IVA (30 de enero) e IRPF (20 de enero)`,
        warning: `Quedan ${daysRemaining} días. Prepara tus modelos`,
        notice: `Quedan ${daysRemaining} días. Preparando la presentación`,
        ok: `A tiempo. IVA: ${ivaDeadlineFormatted}, IRPF: ${irpfDeadlineFormatted}`
    }
    
    const q2Messages: Record<string, string> = {
        critical: `¡URGENTE! Quedan ${daysRemaining} días. IVA (30 de abril) e IRPF (20 de abril)`,
        warning: `Quedan ${daysRemaining} días. Prepara tus modelos`,
        notice: `Quedan ${daysRemaining} días. Preparando la presentación`,
        ok: `A tiempo. IVA: ${ivaDeadlineFormatted}, IRPF: ${irpfDeadlineFormatted}`
    }
    
    const q3Messages: Record<string, string> = {
        critical: `¡URGENTE! Quedan ${daysRemaining} días. IVA (30 de julio) e IRPF (20 de julio)`,
        warning: `Quedan ${daysRemaining} días. Prepara tus modelos`,
        notice: `Quedan ${daysRemaining} días. Preparando la presentación`,
        ok: `A tiempo. IVA: ${ivaDeadlineFormatted}, IRPF: ${irpfDeadlineFormatted}`
    }
    
    const q4Messages: Record<string, string> = {
        critical: `¡URGENTE! Quedan ${daysRemaining} días. IVA (30 de octubre) e IRPF (20 de octubre)`,
        warning: `Quedan ${daysRemaining} días. Prepara tus modelos`,
        notice: `Quedan ${daysRemaining} días. Preparando la presentación`,
        ok: `A tiempo. IVA: ${ivaDeadlineFormatted}, IRPF: ${irpfDeadlineFormatted}`
    }
    
    // Seleccionar mensajes según trimestre
    const messages: Record<string, string> = quarter === 'Q1' ? q1Messages :
                                   quarter === 'Q2' ? q2Messages :
                                   quarter === 'Q3' ? q3Messages :
                                   q4Messages
    
    if (urgency.level === 'ok') {
        return (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <div className="flex-1">
                    <p className="text-xs font-bold text-emerald-800">Impuestos al día</p>
                    <p className="text-xs text-emerald-700">IVA: {ivaDeadlineFormatted} · IRPF: {irpfDeadlineFormatted}</p>
                </div>
            </div>
        )
    }
    
    return (
        <div className={cn(
            "flex items-start gap-3 p-4 rounded-xl border",
            urgency.level === 'critical' && "bg-rose-50 border-rose-200",
            urgency.level === 'warning' && "bg-amber-50 border-amber-200",
            urgency.level === 'notice' && "bg-blue-50 border-blue-200"
        )}>
            <Icon className={cn(
                "w-5 h-5 flex-shrink-0 mt-0.5",
                urgency.level === 'critical' && "text-rose-600",
                urgency.level === 'warning' && "text-amber-600",
                urgency.level === 'notice' && "text-blue-600"
            )} />
            <div className="flex-1">
                <p className={cn(
                    "text-sm font-bold",
                    urgency.level === 'critical' && "text-rose-800",
                    urgency.level === 'warning' && "text-amber-800",
                    urgency.level === 'notice' && "text-blue-800"
                )}>
                    {messages[urgency.level]}
                </p>
                <p className="text-xs text-neutral-600 mt-1">
                    Fecha límite: {ivaDeadlineFormatted} · Modelo 303 (IVA + IRPF)
                </p>
            </div>
        </div>
    )
}
