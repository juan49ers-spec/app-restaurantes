"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion } from "framer-motion"
import { Loader2, Users, Clock, AlertTriangle, Save, CheckCircle2, Lock, Unlock } from "lucide-react"
import { toast } from "sonner"

import { DailySales } from "@/types/schema"
import { upsertDailySales } from "@/app/actions/financial-control"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Schema for the form (extending strict schema with refinements if needed)
// We use the same schema but we handle string/number conversion carefully
const FormSchema = z.object({
    restaurant_id: z.string().uuid(),
    date: z.string(),
    // Multi-IVA Breakdown
    base_10: z.number().min(0, "Debe ser positivo"),
    tax_10: z.number().min(0, "Debe ser positivo"),
    base_21: z.number().min(0, "Debe ser positivo"),
    tax_21: z.number().min(0, "Debe ser positivo"),
    // Details
    revenue_dine_in: z.number().min(0, "Debe ser positivo"),
    revenue_takeout: z.number().min(0, "Debe ser positivo"),
    revenue_delivery: z.number().min(0, "Debe ser positivo"),
    total_covers: z.number().int().min(0),
    labor_hours: z.number().min(0),
    day_status: z.enum(['OPEN', 'CLOSED', 'LOCKED'])
})

interface DailySalesFormProps {
    restaurantId: string
    date: string
    initialData: DailySales | null
}

type FormValues = z.infer<typeof FormSchema>

export function DailySalesForm({ restaurantId, date, initialData }: DailySalesFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)

    // Form setup
    const form = useForm<FormValues>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            restaurant_id: restaurantId,
            date: date,
            base_10: initialData?.base_10 || 0,
            tax_10: initialData?.tax_10 || 0,
            base_21: initialData?.base_21 || 0,
            tax_21: initialData?.tax_21 || 0,
            revenue_dine_in: initialData?.revenue_dine_in || 0,
            revenue_takeout: initialData?.revenue_takeout || 0,
            revenue_delivery: initialData?.revenue_delivery || 0,
            total_covers: initialData?.total_covers || 0,
            labor_hours: initialData?.labor_hours || 0,
            day_status: (initialData?.day_status as "OPEN" | "CLOSED" | "LOCKED") || 'OPEN'
        }
    })

    // Update form when date/data changes
    useEffect(() => {
        form.reset({
            restaurant_id: restaurantId,
            date: date,
            base_10: initialData?.base_10 || 0,
            tax_10: initialData?.tax_10 || 0,
            base_21: initialData?.base_21 || 0,
            tax_21: initialData?.tax_21 || 0,
            revenue_dine_in: initialData?.revenue_dine_in || 0,
            revenue_takeout: initialData?.revenue_takeout || 0,
            revenue_delivery: initialData?.revenue_delivery || 0,
            total_covers: initialData?.total_covers || 0,
            labor_hours: initialData?.labor_hours || 0,
            day_status: initialData?.day_status || 'OPEN'
        })
    }, [date, initialData, restaurantId, form])

    // Real-time Calculations
    const base10 = form.watch('base_10')
    const tax10 = form.watch('tax_10')
    const base21 = form.watch('base_21')
    const tax21 = form.watch('tax_21')

    const dineIn = form.watch('revenue_dine_in')
    const takeout = form.watch('revenue_takeout')
    const delivery = form.watch('revenue_delivery')
    const covers = form.watch('total_covers')
    const laborHours = form.watch('labor_hours')

    // Safety ensuring they are numbers
    const totalTaxed = (Number(base10) || 0) + (Number(tax10) || 0) + (Number(base21) || 0) + (Number(tax21) || 0)
    const totalRevenue = (Number(dineIn) || 0) + (Number(takeout) || 0) + (Number(delivery) || 0)

    // Integrity check: Total from payments should match total from IVA breakdown
    const isImbalanced = Math.abs(totalTaxed - totalRevenue) > 0.05 // allowance for small rounding

    const avgTicket = covers > 0 ? totalRevenue / covers : 0

    // Logic Validation Checks
    const isTicketLow = avgTicket < 10 && covers > 0

    const onSubmit = async (values: z.infer<typeof FormSchema>) => {
        if (isImbalanced && !confirm("El total de facturacion por IVA no coincide con el desglose de pagos. ¿Deseas continuar?")) {
            return
        }

        setIsSubmitting(true)
        try {
            const submitData = {
                ...values,
                revenue_total: totalRevenue,
                source: 'manual_entry',
                // Keep iva_collected for backward compatibility
                iva_collected: (Number(values.tax_10) || 0) + (Number(values.tax_21) || 0),
                cost_of_goods: 0,
                labor_cost: 0
            }

            const result = await upsertDailySales(submitData)

            if (!result.success) throw new Error(result.error)

            toast.success("Cierre de caja guardado correctamente")
            setLastSaved(new Date())
        } catch (error) {
            toast.error("Error al guardar el cierre")
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Lock guard
    const isLocked = initialData?.day_status === 'LOCKED'
    const [canEdit, setCanEdit] = useState(!isLocked)

    // Handle unlock
    const handleUnlock = () => {
        if (confirm("Este día está bloqueado. ¿Quieres desbloquearlo para editar?")) {
            setCanEdit(true)
        }
    }

    const shouldDisable = isLocked && !canEdit

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* KPI Cards - Reduced to 3 essential metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="bg-white border-neutral-200/60 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-0.5 h-full bg-emerald-500" />
                    <CardHeader className="pb-1.5 px-3 pt-2.5">
                        <CardTitle className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide">Ventas Día</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-2.5">
                        <div className="text-xl font-semibold text-neutral-900 tabular-nums">
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalRevenue)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-neutral-200/60 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-0.5 h-full bg-blue-500" />
                    <CardHeader className="pb-1.5 px-3 pt-2.5">
                        <CardTitle className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide">Ticket Medio</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-2.5">
                        <div className="flex items-center gap-1.5">
                            <div className="text-xl font-semibold text-neutral-900 tabular-nums">
                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(avgTicket)}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Live Margin Card - Simplified */}
                <LiveMarginCard totalRevenue={totalRevenue} laborHours={laborHours} />
            </div>
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Registro de Ventas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {shouldDisable && (
                        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-2 text-amber-800 text-xs">
                                <Lock className="w-3 h-3" />
                                <span className="text-xs font-medium">Día bloqueado</span>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleUnlock}
                                className="bg-white border-amber-300 text-amber-700 hover:bg-amber-50 h-7 px-2 text-[10px]"
                            >
                                <Unlock className="w-2.5 h-2.5 mr-1" /> Desbloquear
                            </Button>
                        </div>
                    )}

                    <fieldset disabled={shouldDisable} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="dine_in" className="text-xs">Sala / Barra</Label>
                            <Input
                                id="dine_in"
                                type="number"
                                step="0.01"
                                {...form.register('revenue_dine_in', { valueAsNumber: true })}
                                className="text-sm font-mono h-9"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="takeout" className="text-xs">Take Away</Label>
                            <Input
                                id="takeout"
                                type="number"
                                step="0.01"
                                {...form.register('revenue_takeout', { valueAsNumber: true })}
                                className="text-sm font-mono h-9"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="delivery" className="text-xs">Delivery</Label>
                            <Input
                                id="delivery"
                                type="number"
                                step="0.01"
                                {...form.register('revenue_delivery', { valueAsNumber: true })}
                                className="text-sm font-mono h-9"
                            />
                        </div>
                    </fieldset>

                    <Separator className="my-4" />

                    <fieldset disabled={shouldDisable} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="covers" className="flex items-center gap-1.5 text-xs">
                                <Users className="w-3.5 h-3.5 text-neutral-500" /> Comensales
                            </Label>
                            <Input
                                id="covers"
                                type="number"
                                {...form.register('total_covers', { valueAsNumber: true })}
                                className="h-9 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="labor" className="flex items-center gap-1.5 text-xs">
                                <Clock className="w-3.5 h-3.5 text-neutral-500" /> Horas Equipo
                            </Label>
                            <Input
                                id="labor"
                                type="number"
                                step="0.5"
                                {...form.register('labor_hours', { valueAsNumber: true })}
                                className="h-9 text-sm"
                            />
                        </div>
                    </fieldset>

                    {/* Logic Integrity Alert */}
                    {isTicketLow && (
                        <Alert variant="destructive" className="mt-3 py-2 px-3">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <AlertTitle className="text-xs">Verificar datos</AlertTitle>
                            <AlertDescription className="text-xs">
                                Ticket medio bajo ({avgTicket.toFixed(1)}€)
                            </AlertDescription>
                        </Alert>
                    )}

                </CardContent>

                <CardFooter className="flex justify-between items-center bg-slate-50/50 border-t py-2.5 px-4">
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
                        {lastSaved && (
                            <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{lastSaved.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                            </>
                        )}
                    </div>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-neutral-900 text-white hover:bg-neutral-800 text-[10px] h-7 px-3 rounded-md font-medium"
                    >
                        {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Guardar"}
                    </Button>
                </CardFooter>
            </Card>

            <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-neutral-500">
                    {lastSaved && `Guardado hace ${Math.floor((new Date().getTime() - lastSaved.getTime()) / 1000)}s`}
                </div>

                {!shouldDisable ? (
                    <Button type="submit" size="lg" disabled={isSubmitting} className="w-full md:w-auto min-w-[200px] shadow-lg hover:shadow-xl transition-all">
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" /> Guardar Cierre
                            </>
                        )}
                    </Button>
                ) : (
                    <Button
                        type="button"
                        onClick={handleUnlock}
                        variant="outline"
                        className="w-full md:w-auto opacity-80 hover:opacity-100"
                    >
                        <Unlock className="mr-2 h-4 w-4" /> Desbloquear para Editar
                    </Button>
                )}
            </div>
        </form >
    )
}

function LiveMarginCard({ totalRevenue, laborHours }: { totalRevenue: number, laborHours: number }) {
    // Estimations for gamification
    const ESTIMATED_HOURLY_COST = 15 // €/hour avg loaded cost
    const ESTIMATED_COGS_PCT = 0.30 // 30% Food Cost standard
    const ESTIMATED_FIXED_COST_DAILY = 200 // €/day placeholder

    const laborCost = laborHours * ESTIMATED_HOURLY_COST
    const cogs = totalRevenue * ESTIMATED_COGS_PCT
    const estimatedMargin = totalRevenue - (laborCost + cogs + ESTIMATED_FIXED_COST_DAILY)
    const marginPct = totalRevenue > 0 ? (estimatedMargin / totalRevenue) * 100 : 0

    let color = "bg-slate-500"
    let textColor = "text-slate-600"
    let statusText = "Calculando..."
    let emoji = "🤔"

    if (totalRevenue > 0) {
        if (marginPct >= 20) {
            color = "bg-emerald-500"
            textColor = "text-emerald-600"
            statusText = "¡Excelente!"
            emoji = "🚀"
        } else if (marginPct >= 10) {
            color = "bg-amber-500"
            textColor = "text-amber-600"
            statusText = "Aceptable"
            emoji = "👌"
        } else {
            color = "bg-rose-500"
            textColor = "text-rose-600"
            statusText = "Crítico"
            emoji = "⚠️"
        }
    }

    return (
        <Card className="bg-white border-neutral-200/60 shadow-sm relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-0.5 h-full ${color}`} />
            <CardHeader className="pb-1.5 px-3 pt-2.5">
                <CardTitle className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide flex justify-between">
                    Margen Est. <span className="text-[10px] grayscale">{emoji}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-2.5">
                <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline">
                        <span className={`text-xl font-semibold tabular-nums ${textColor}`}>
                            {totalRevenue > 0 ? `${marginPct.toFixed(0)}%` : "--"}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground">{statusText}</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1 w-full bg-neutral-100 rounded-full overflow-hidden">
                        <motion.div
                            className={`h-full ${color}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(0, Math.min(100, marginPct))}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
