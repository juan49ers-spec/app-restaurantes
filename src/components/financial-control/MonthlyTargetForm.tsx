"use client"

import { useState } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Save, Loader2, Target, Percent, Euro } from "lucide-react"
import { MonthlyTargetSchema, MonthlyTarget } from "@/types/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { upsertMonthlyTarget } from "@/app/actions/financial-control-core"

interface TargetFormProps {
    restaurantId: string
    currentMonth: string // YYYY-MM
    initialData: MonthlyTarget | null
    onSuccess?: () => void
    showCard?: boolean
}

export function MonthlyTargetForm({ restaurantId, currentMonth, initialData, onSuccess, showCard = true }: TargetFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<z.infer<typeof MonthlyTargetSchema>>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zodResolver generic mismatch with Zod v4
        resolver: zodResolver(MonthlyTargetSchema) as any,
        defaultValues: {
            restaurant_id: restaurantId,
            month_year: currentMonth,
            revenue_target: initialData?.revenue_target ?? 0,
            cogs_target_pct: (initialData?.cogs_target_pct ?? 0) * 100,
            labor_target_pct: (initialData?.labor_target_pct ?? 0) * 100
        }
    })

    const onSubmit = async (values: z.infer<typeof MonthlyTargetSchema>) => {
        setIsSubmitting(true)
        try {
            const submitData = {
                ...values,
                // Convert percentages back to decimals for storage
                cogs_target_pct: (values.cogs_target_pct || 0) / 100,
                labor_target_pct: (values.labor_target_pct || 0) / 100
            }
            const result = await upsertMonthlyTarget(submitData as MonthlyTarget)
            if (!result.success) throw new Error(result.error)
            toast.success("Objetivos actualizados correctamente")
            onSuccess?.()
        } catch (error) {
            toast.error("Error al guardar objetivos")
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const FormContent = (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-slate-700">
                        <Euro className="w-3.5 h-3.5 text-slate-400" /> Presupuesto de Ventas (€)
                    </Label>
                    <Input
                        type="number"
                        placeholder="45000"
                        {...form.register('revenue_target', { valueAsNumber: true })}
                        className="font-mono"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-slate-700">
                        <Percent className="w-3.5 h-3.5 text-slate-400" /> Objetivo Materia Prima (%)
                    </Label>
                    <Input
                        type="number"
                        step="0.1"
                        placeholder="28"
                        {...form.register('cogs_target_pct', { valueAsNumber: true })}
                        className="font-mono"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-slate-700">
                        <Percent className="w-3.5 h-3.5 text-slate-400" /> Objetivo Personal (%)
                    </Label>
                    <Input
                        type="number"
                        step="0.1"
                        placeholder="25"
                        {...form.register('labor_target_pct', { valueAsNumber: true })}
                        className="font-mono"
                    />
                </div>
            </div>

            <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" /> Guardar Objetivos
                        </>
                    )}
                </Button>
            </div>
        </form>
    )

    if (!showCard) return FormContent

    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
            <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                    <Target className="w-5 h-5 text-blue-600" />
                    <CardTitle>Presupuesto Mensual — {currentMonth}</CardTitle>
                </div>
                <CardDescription>
                    Define tus metas para calcular desviaciones y rendimiento real.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {FormContent}
            </CardContent>
        </Card>
    )
}
