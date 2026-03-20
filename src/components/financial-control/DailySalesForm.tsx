"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { m } from "framer-motion"
import { Loader2, Users, Clock, AlertTriangle, Save, CheckCircle2, Lock, Unlock, Receipt, Percent, Banknote, ChevronDown, ChevronUp, CreditCard, Wallet } from "lucide-react"
import { toast } from "sonner"

import { DailySales } from "@/types/schema"
import { upsertDailySales, unlockDailySales } from "@/app/actions/financial-control"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { round } from "@/lib/utils"
import { LIVE_MARGIN_ESTIMATES } from "@/lib/financial-constants"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const FormSchema = z.object({
    restaurant_id: z.string().uuid(),
    date: z.string(),
    // Multi-IVA Breakdown
    base_10: z.number().min(0, "Debe ser positivo"),
    tax_10: z.number().min(0, "Debe ser positivo"),
    base_21: z.number().min(0, "Debe ser positivo"),
    tax_21: z.number().min(0, "Debe ser positivo"),
    // Channel breakdown
    revenue_dine_in: z.number().min(0, "Debe ser positivo"),
    revenue_takeout: z.number().min(0, "Debe ser positivo"),
    revenue_delivery: z.number().min(0, "Debe ser positivo"),
    // Delivery platforms
    delivery_uber_eats: z.number().min(0),
    delivery_just_eat: z.number().min(0),
    delivery_al_punto: z.number().min(0),
    delivery_glovo: z.number().min(0),
    // Payment methods
    cash_amount: z.number().min(0),
    card_amount: z.number().min(0),
    // Operations
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
    const [showDeliveryPlatforms, setShowDeliveryPlatforms] = useState(false)

    // Form setup
    const form = useForm<FormValues>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            restaurant_id: restaurantId,
            date: date,
            base_10: round(initialData?.base_10 || 0),
            tax_10: round(initialData?.tax_10 || 0),
            base_21: round(initialData?.base_21 || 0),
            tax_21: round(initialData?.tax_21 || 0),
            revenue_dine_in: round(initialData?.revenue_dine_in || 0),
            revenue_takeout: round(initialData?.revenue_takeout || 0),
            revenue_delivery: round(initialData?.revenue_delivery || 0),
            delivery_uber_eats: round(initialData?.delivery_uber_eats || 0),
            delivery_just_eat: round(initialData?.delivery_just_eat || 0),
            delivery_al_punto: round(initialData?.delivery_al_punto || 0),
            delivery_glovo: round(initialData?.delivery_glovo || 0),
            cash_amount: round(initialData?.cash_amount || 0),
            card_amount: round(initialData?.card_amount || 0),
            total_covers: initialData?.total_covers || 0,
            labor_hours: round(initialData?.labor_hours || 0),
            day_status: (initialData?.day_status as "OPEN" | "CLOSED" | "LOCKED") || 'OPEN'
        }
    })

    // Update form when date/data changes
    useEffect(() => {
        form.reset({
            restaurant_id: restaurantId,
            date: date,
            base_10: round(initialData?.base_10 || 0),
            tax_10: round(initialData?.tax_10 || 0),
            base_21: round(initialData?.base_21 || 0),
            tax_21: round(initialData?.tax_21 || 0),
            revenue_dine_in: round(initialData?.revenue_dine_in || 0),
            revenue_takeout: round(initialData?.revenue_takeout || 0),
            revenue_delivery: round(initialData?.revenue_delivery || 0),
            delivery_uber_eats: round(initialData?.delivery_uber_eats || 0),
            delivery_just_eat: round(initialData?.delivery_just_eat || 0),
            delivery_al_punto: round(initialData?.delivery_al_punto || 0),
            delivery_glovo: round(initialData?.delivery_glovo || 0),
            cash_amount: round(initialData?.cash_amount || 0),
            card_amount: round(initialData?.card_amount || 0),
            total_covers: initialData?.total_covers || 0,
            labor_hours: round(initialData?.labor_hours || 0),
            day_status: initialData?.day_status || 'OPEN'
        })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date, initialData, restaurantId])
    // NOTE: `form` is intentionally omitted — react-hook-form guarantees its reference is stable

    // Auto-calculate IVA when base changes
    const base10 = form.watch('base_10')
    const base21 = form.watch('base_21')
    useEffect(() => {
        form.setValue('tax_10', round((Number(base10) || 0) * 0.10))
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [base10])
    useEffect(() => {
        form.setValue('tax_21', round((Number(base21) || 0) * 0.21))
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [base21])

    // Real-time Calculations
    const tax10 = form.watch('tax_10')
    const tax21 = form.watch('tax_21')

    const dineIn = form.watch('revenue_dine_in')
    const takeout = form.watch('revenue_takeout')
    const delivery = form.watch('revenue_delivery')
    const uberEats = form.watch('delivery_uber_eats')
    const justEat = form.watch('delivery_just_eat')
    const alPunto = form.watch('delivery_al_punto')
    const glovo = form.watch('delivery_glovo')
    const cashAmount = form.watch('cash_amount')
    const cardAmount = form.watch('card_amount')
    const covers = form.watch('total_covers')
    const laborHours = form.watch('labor_hours')

    // Auto-calculate delivery total from platforms
    useEffect(() => {
        const sum = round((Number(uberEats) || 0) + (Number(justEat) || 0) + (Number(alPunto) || 0) + (Number(glovo) || 0))
        if (sum > 0) form.setValue('revenue_delivery', sum)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uberEats, justEat, alPunto, glovo])

    const totalTaxed = round((Number(base10) || 0) + (Number(tax10) || 0) + (Number(base21) || 0) + (Number(tax21) || 0))
    const totalRevenue = round((Number(dineIn) || 0) + (Number(takeout) || 0) + (Number(delivery) || 0))
    const totalPlatforms = round((Number(uberEats) || 0) + (Number(justEat) || 0) + (Number(alPunto) || 0) + (Number(glovo) || 0))
    const totalPayments = round((Number(cashAmount) || 0) + (Number(cardAmount) || 0))

    // Integrity checks
    const isImbalanced = Math.abs(totalTaxed - totalRevenue) > 0.05
    const isPlatformsOver = totalPlatforms > (Number(delivery) || 0) + 0.05
    const isPaymentsImbalanced = totalPayments > 0 && Math.abs(totalPayments - totalRevenue) > 0.05

    const avgTicket = covers > 0 ? round(totalRevenue / covers) : 0
    const isTicketLow = avgTicket < 10 && covers > 0

    const onSubmit = async (values: z.infer<typeof FormSchema>) => {
        if (isImbalanced && !confirm("El total de facturacion por IVA no coincide con el desglose de pagos. ¿Deseas continuar?")) {
            return
        }

        setIsSubmitting(true)
        try {
            const submitData = {
                ...values,
                base_10: round(values.base_10),
                tax_10: round(values.tax_10),
                base_21: round(values.base_21),
                tax_21: round(values.tax_21),
                revenue_dine_in: round(values.revenue_dine_in),
                revenue_takeout: round(values.revenue_takeout),
                revenue_delivery: round(values.revenue_delivery),
                delivery_uber_eats: round(values.delivery_uber_eats),
                delivery_just_eat: round(values.delivery_just_eat),
                delivery_al_punto: round(values.delivery_al_punto),
                delivery_glovo: round(values.delivery_glovo),
                cash_amount: round(values.cash_amount),
                card_amount: round(values.card_amount),
                labor_hours: round(values.labor_hours),
                revenue_total: round(totalRevenue),
                source: 'manual_entry',
                iva_collected: round((Number(values.tax_10) || 0) + (Number(values.tax_21) || 0)),
                cost_of_goods: round(initialData?.cost_of_goods || 0),
                labor_cost: round(initialData?.labor_cost || 0)
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
    const [isUnlocking, setIsUnlocking] = useState(false)

    // Handle unlock — persists day_status change to Supabase
    const handleUnlock = async () => {
        if (!confirm("Este día está bloqueado. ¿Quieres desbloquearlo para editar?")) return
        setIsUnlocking(true)
        try {
            const result = await unlockDailySales(restaurantId, date)
            if (result.success) {
                setCanEdit(true)
                form.setValue('day_status', 'OPEN')
                toast.success("Día desbloqueado correctamente")
            } else {
                toast.error("No se pudo desbloquear: " + result.error)
            }
        } finally {
            setIsUnlocking(false)
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
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalRevenue)}
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
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(avgTicket)}
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
                                disabled={isUnlocking}
                                className="bg-white/80 border-amber-300/50 text-amber-700 hover:bg-amber-100 transition-colors shadow-sm"
                            >
                                {isUnlocking ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Unlock className="w-3.5 h-3.5 mr-2" />}
                                Desbloquear edición
                            </Button>
                        </div>
                    )}

                    <fieldset disabled={shouldDisable} className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2 group">
                            <Label htmlFor="base_10" className="text-xs font-semibold uppercase tracking-wider text-neutral-500 group-focus-within:text-emerald-600 transition-colors">Base 10%</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">€</span>
                                <Input
                                    id="base_10"
                                    type="number"
                                    step="0.01"
                                    {...form.register('base_10', { valueAsNumber: true })}
                                    className="pl-7 h-10 bg-white/40 border-neutral-200/60 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all rounded-xl font-mono text-sm"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tax_10" className="text-xs font-semibold uppercase tracking-wider text-neutral-400">IVA 10% <span className="normal-case font-normal">(auto)</span></Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300 text-sm">€</span>
                                <Input
                                    id="tax_10"
                                    type="number"
                                    step="0.01"
                                    readOnly
                                    {...form.register('tax_10', { valueAsNumber: true })}
                                    className="pl-7 h-10 bg-neutral-50 border-neutral-200/40 text-neutral-500 rounded-xl font-mono text-sm cursor-default"
                                />
                            </div>
                        </div>
                        <div className="space-y-2 group">
                            <Label htmlFor="base_21" className="text-xs font-semibold uppercase tracking-wider text-neutral-500 group-focus-within:text-emerald-600 transition-colors">Base 21%</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">€</span>
                                <Input
                                    id="base_21"
                                    type="number"
                                    step="0.01"
                                    {...form.register('base_21', { valueAsNumber: true })}
                                    className="pl-7 h-10 bg-white/40 border-neutral-200/60 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all rounded-xl font-mono text-sm"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tax_21" className="text-xs font-semibold uppercase tracking-wider text-neutral-400">IVA 21% <span className="normal-case font-normal">(auto)</span></Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300 text-sm">€</span>
                                <Input
                                    id="tax_21"
                                    type="number"
                                    step="0.01"
                                    readOnly
                                    {...form.register('tax_21', { valueAsNumber: true })}
                                    className="pl-7 h-10 bg-neutral-50 border-neutral-200/40 text-neutral-500 rounded-xl font-mono text-sm cursor-default"
                                />
                            </div>
                        </div>
                    </fieldset>

                    <Separator className="bg-neutral-100" />

                    {/* Canales de venta */}
                    <fieldset disabled={shouldDisable} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2 group">
                                <Label htmlFor="dine_in" className="text-sm font-medium text-neutral-600 group-focus-within:text-neutral-900 transition-colors">Sala / Barra</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">€</span>
                                    <Input
                                        id="dine_in"
                                        type="number"
                                        step="0.01"
                                        {...form.register('revenue_dine_in', { valueAsNumber: true })}
                                        className="pl-8 text-base font-mono h-11 bg-white/40 border-neutral-200/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all shadow-sm rounded-xl"
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
                                        className="pl-8 text-base font-mono h-11 bg-white/40 border-neutral-200/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all shadow-sm rounded-xl"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 group">
                                <Label htmlFor="delivery" className="text-sm font-medium text-neutral-600 group-focus-within:text-neutral-900 transition-colors">Delivery (total)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">€</span>
                                    <Input
                                        id="delivery"
                                        type="number"
                                        step="0.01"
                                        {...form.register('revenue_delivery', { valueAsNumber: true })}
                                        className="pl-8 text-base font-mono h-11 bg-white/40 border-neutral-200/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all shadow-sm rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Plataformas de delivery — expandible */}
                        <div>
                            <button
                                type="button"
                                onClick={() => setShowDeliveryPlatforms(v => !v)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition-colors py-1"
                            >
                                {showDeliveryPlatforms ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                Desglosar por plataforma
                                {totalPlatforms > 0 && (
                                    <span className="ml-1 text-emerald-600">({new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(totalPlatforms)})</span>
                                )}
                            </button>

                            {showDeliveryPlatforms && (
                                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 pl-4 border-l-2 border-neutral-100">
                                    {[
                                        { id: 'delivery_uber_eats', label: 'Uber Eats' },
                                        { id: 'delivery_just_eat', label: 'Just Eat' },
                                        { id: 'delivery_al_punto', label: 'Al Punto' },
                                        { id: 'delivery_glovo', label: 'Glovo' },
                                    ].map(({ id, label }) => (
                                        <div key={id} className="space-y-1.5 group">
                                            <Label htmlFor={id} className="text-xs font-medium text-neutral-500 group-focus-within:text-neutral-800 transition-colors">{label}</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">€</span>
                                                <Input
                                                    id={id}
                                                    type="number"
                                                    step="0.01"
                                                    {...form.register(id as 'delivery_uber_eats' | 'delivery_just_eat' | 'delivery_al_punto' | 'delivery_glovo', { valueAsNumber: true })}
                                                    className="pl-7 h-9 text-sm font-mono bg-white/40 border-neutral-200/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all rounded-xl"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {isPlatformsOver && showDeliveryPlatforms && (
                                <p className="mt-2 text-xs text-rose-500 font-medium">
                                    La suma de plataformas ({new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(totalPlatforms)}) supera el total de delivery.
                                </p>
                            )}
                        </div>
                    </fieldset>

                    <Separator className="bg-neutral-100" />

                    {/* Método de cobro */}
                    <fieldset disabled={shouldDisable} className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Método de Cobro</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 group">
                                <Label htmlFor="cash_amount" className="flex items-center gap-2 text-sm font-medium text-neutral-600 group-focus-within:text-neutral-900 transition-colors">
                                    <Wallet className="w-4 h-4 text-neutral-400 group-focus-within:text-emerald-500 transition-colors" /> Efectivo
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">€</span>
                                    <Input
                                        id="cash_amount"
                                        type="number"
                                        step="0.01"
                                        {...form.register('cash_amount', { valueAsNumber: true })}
                                        className="pl-8 text-base font-mono h-11 bg-white/40 border-neutral-200/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all shadow-sm rounded-xl"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 group">
                                <Label htmlFor="card_amount" className="flex items-center gap-2 text-sm font-medium text-neutral-600 group-focus-within:text-neutral-900 transition-colors">
                                    <CreditCard className="w-4 h-4 text-neutral-400 group-focus-within:text-blue-500 transition-colors" /> Tarjeta
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">€</span>
                                    <Input
                                        id="card_amount"
                                        type="number"
                                        step="0.01"
                                        {...form.register('card_amount', { valueAsNumber: true })}
                                        className="pl-8 text-base font-mono h-11 bg-white/40 border-neutral-200/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all shadow-sm rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>
                        {isPaymentsImbalanced && (
                            <p className="text-xs text-amber-600 font-medium">
                                Efectivo + Tarjeta ({new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(totalPayments)}) no coincide con el total de ventas.
                            </p>
                        )}
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
                                Ticket medio excepcionalmente bajo ({new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(avgTicket)}).
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
                        disabled={isUnlocking}
                        variant="outline"
                        size="lg"
                        className="w-full md:w-auto rounded-full bg-white shadow-sm hover:bg-neutral-50 hover:text-neutral-900 border-neutral-200 font-medium transition-all"
                    >
                        {isUnlocking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unlock className="mr-2 h-4 w-4" />}
                        Desbloquear Edición
                    </Button>
                )}
            </div>
        </form >
    )
}

function LiveMarginCard({ totalRevenue, laborHours }: { totalRevenue: number, laborHours: number }) {
    const laborCost = laborHours * LIVE_MARGIN_ESTIMATES.HOURLY_LABOR_COST_EUR
    const cogs = totalRevenue * LIVE_MARGIN_ESTIMATES.COGS_PCT
    const estimatedMargin = totalRevenue - (laborCost + cogs + LIVE_MARGIN_ESTIMATES.DAILY_FIXED_COST_EUR)
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
                            {totalRevenue > 0 ? `${marginPct.toFixed(2)}%` : "--"}
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
