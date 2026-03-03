"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { m } from "framer-motion"
import { Loader2, Users, Clock, AlertTriangle, Save, CheckCircle2, Lock, Unlock, TrendingUp, Receipt, Percent, Banknote } from "lucide-react"
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
                cost_of_goods: initialData?.cost_of_goods || 0,
                labor_cost: initialData?.labor_cost || 0
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

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white/60 backdrop-blur-xl border-neutral-200/50 shadow-sm hover:shadow-md transition-all duration-300">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-neutral-500 flex items-center justify-between">
                            Ventas Día
                            <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
                                <Banknote className="w-4 h-4" />
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-neutral-900 tabular-nums tracking-tight">
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalRevenue)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white/60 backdrop-blur-xl border-neutral-200/50 shadow-sm hover:shadow-md transition-all duration-300">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-neutral-500 flex items-center justify-between">
                            Ticket Medio
                            <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
                                <Receipt className="w-4 h-4" />
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-neutral-900 tabular-nums tracking-tight">
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(avgTicket)}
                        </div>
                    </CardContent>
                </Card>

                {/* Live Margin Card */}
                <LiveMarginCard totalRevenue={totalRevenue} laborHours={laborHours} />
            </div>
            <Card className="bg-white/80 backdrop-blur-xl border-neutral-200/50 shadow-sm overflow-hidden">
                <CardHeader className="bg-neutral-50/50 border-b border-neutral-100/50 pb-4">
                    <CardTitle className="text-lg font-medium tracking-tight text-neutral-900">Registro de Ventas</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    {shouldDisable && (
                        <div className="mb-4 p-4 bg-amber-50/80 border border-amber-200/50 rounded-xl flex items-center justify-between backdrop-blur-sm">
                            <div className="flex items-center gap-3 text-amber-800">
                                <div className="p-2 bg-amber-100 rounded-lg">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium">Día bloqueado</span>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleUnlock}
                                className="bg-white/80 border-amber-300/50 text-amber-700 hover:bg-amber-100 transition-colors shadow-sm"
                            >
                                <Unlock className="w-3.5 h-3.5 mr-2" /> Desbloquear edición
                            </Button>
                        </div>
                    )}

                    <fieldset disabled={shouldDisable} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2 group">
                            <Label htmlFor="dine_in" className="text-sm font-medium text-neutral-600 group-focus-within:text-neutral-900 transition-colors">Sala / Barra</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">€</span>
                                <Input
                                    id="dine_in"
                                    type="number"
                                    step="0.01"
                                    {...form.register('revenue_dine_in', { valueAsNumber: true })}
                                    className="pl-8 text-base font-mono h-11 bg-white/50 border-neutral-200 focus:bg-white transition-all shadow-sm"
                                />
                            </div>
                        </div>
                        <div className="space-y-2 group">
                            <Label htmlFor="takeout" className="text-sm font-medium text-neutral-600 group-focus-within:text-neutral-900 transition-colors">Take Away</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">€</span>
                                <Input
                                    id="takeout"
                                    type="number"
                                    step="0.01"
                                    {...form.register('revenue_takeout', { valueAsNumber: true })}
                                    className="pl-8 text-base font-mono h-11 bg-white/50 border-neutral-200 focus:bg-white transition-all shadow-sm"
                                />
                            </div>
                        </div>
                        <div className="space-y-2 group">
                            <Label htmlFor="delivery" className="text-sm font-medium text-neutral-600 group-focus-within:text-neutral-900 transition-colors">Delivery</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">€</span>
                                <Input
                                    id="delivery"
                                    type="number"
                                    step="0.01"
                                    {...form.register('revenue_delivery', { valueAsNumber: true })}
                                    className="pl-8 text-base font-mono h-11 bg-white/50 border-neutral-200 focus:bg-white transition-all shadow-sm"
                                />
                            </div>
                        </div>
                    </fieldset>

                    <Separator className="bg-neutral-100" />

                    <fieldset disabled={shouldDisable} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 group">
                            <Label htmlFor="covers" className="flex items-center gap-2 text-sm font-medium text-neutral-600 group-focus-within:text-neutral-900 transition-colors">
                                <Users className="w-4 h-4 text-neutral-400 group-focus-within:text-indigo-500 transition-colors" /> Comensales
                            </Label>
                            <Input
                                id="covers"
                                type="number"
                                {...form.register('total_covers', { valueAsNumber: true })}
                                className="h-11 text-base bg-white/50 border-neutral-200 focus:bg-white transition-all shadow-sm"
                            />
                        </div>
                        <div className="space-y-2 group">
                            <Label htmlFor="labor" className="flex items-center gap-2 text-sm font-medium text-neutral-600 group-focus-within:text-neutral-900 transition-colors">
                                <Clock className="w-4 h-4 text-neutral-400 group-focus-within:text-indigo-500 transition-colors" /> Horas Equipo
                            </Label>
                            <Input
                                id="labor"
                                type="number"
                                step="0.5"
                                {...form.register('labor_hours', { valueAsNumber: true })}
                                className="h-11 text-base bg-white/50 border-neutral-200 focus:bg-white transition-all shadow-sm"
                            />
                        </div>
                    </fieldset>

                    {/* Logic Integrity Alert */}
                    {isTicketLow && (
                        <Alert variant="destructive" className="bg-rose-50/50 border-rose-200/50 text-rose-800 rounded-xl">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle className="text-sm font-semibold">Alerta de Integridad</AlertTitle>
                            <AlertDescription className="text-xs mt-1 text-rose-700/80">
                                Ticket medio excepcionalmente bajo ({new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(avgTicket)}).
                                Por favor, verifica el número de comensales o la recaudación.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 bg-neutral-100/50 px-3 py-1.5 rounded-full border border-neutral-200/50">
                    {lastSaved ? (
                        <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Guardado a las {lastSaved.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                        </>
                    ) : (
                        <span className="text-neutral-400">Sin cambios guardados</span>
                    )}
                </div>

                {!shouldDisable ? (
                    <Button type="submit" size="lg" disabled={isSubmitting} className="w-full md:w-auto min-w-[200px] shadow-md hover:shadow-lg transition-all rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-medium">
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" /> Guardar Cierre de Caja
                            </>
                        )}
                    </Button>
                ) : (
                    <Button
                        type="button"
                        onClick={handleUnlock}
                        variant="outline"
                        size="lg"
                        className="w-full md:w-auto rounded-full bg-white shadow-sm hover:bg-neutral-50 hover:text-neutral-900 border-neutral-200 font-medium transition-all"
                    >
                        <Unlock className="mr-2 h-4 w-4" /> Desbloquear Edición
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
    let bgLight = "bg-slate-50"
    let textColor = "text-slate-600"
    let statusText = "Calculando..."

    if (totalRevenue > 0) {
        if (marginPct >= 20) {
            color = "bg-emerald-500"
            bgLight = "bg-emerald-50"
            textColor = "text-emerald-600"
            statusText = "Excelente"
        } else if (marginPct >= 10) {
            color = "bg-amber-500"
            bgLight = "bg-amber-50"
            textColor = "text-amber-600"
            statusText = "Aceptable"
        } else {
            color = "bg-rose-500"
            bgLight = "bg-rose-50"
            textColor = "text-rose-600"
            statusText = "Crítico"
        }
    }

    return (
        <Card className="bg-white/60 backdrop-blur-xl border-neutral-200/50 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-neutral-500 flex items-center justify-between">
                    Margen Est.
                    <div className={`p-1.5 rounded-lg ${bgLight} ${textColor}`}>
                        <Percent className="w-4 h-4" />
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div className="flex justify-between items-baseline">
                        <span className={`text-2xl font-bold tabular-nums tracking-tight ${textColor}`}>
                            {totalRevenue > 0 ? `${marginPct.toFixed(0)}%` : "--"}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground bg-white/50 px-2 py-0.5 rounded-full border border-neutral-100">
                            {statusText}
                        </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-neutral-100/80 rounded-full overflow-hidden">
                        <m.div
                            className={`h-full ${color} rounded-full`}
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
