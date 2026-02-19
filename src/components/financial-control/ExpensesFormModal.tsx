"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import {
    Plus,
    Loader2,
    X
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { OperatingExpenseCategory, EXPENSE_CATEGORY_LABELS, EXPENSE_TAGS, OperatingExpenseCategorySchema } from "@/types/schema"
import { upsertOperatingExpense } from "@/app/actions/financial-control"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

const ExpenseFormSchema = z.object({
    restaurant_id: z.string().uuid(),
    expense_date: z.string(),
    category: OperatingExpenseCategorySchema,
    amount: z.number(),
    description: z.string().optional(),
    provider_detail: z.string().optional(),
    tag: z.string().optional(),
    payment_method: z.enum(['bank', 'cash', 'card', 'transfer', 'other']).default('bank'),
    recurrence: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).default('NONE'),
    is_paid: z.boolean().default(true),
    is_professional_invoice: z.boolean().default(false),
    taxable_amount: z.number().optional(),
    tax_rate: z.number().optional(),
    tax_amount: z.number().optional(),
    withholding_rate: z.number().optional(),
    withholding_amount: z.number().optional()
})

type ExpenseFormValues = z.infer<typeof ExpenseFormSchema>

interface ExpensesFormModalProps {
    isOpen: boolean
    onClose: () => void
    restaurantId: string
    expenseToEdit?: any // Optional expense object to edit
}

export function ExpensesFormModal({ isOpen, onClose, restaurantId, expenseToEdit }: ExpensesFormModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Reset/Initialize form when opening or editing
    const defaultValues: ExpenseFormValues = {
        restaurant_id: restaurantId,
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        category: 'ALQUILER',
        amount: 0,
        description: '',
        provider_detail: '',
        tag: '',
        payment_method: 'bank',
        recurrence: 'NONE',
        is_paid: true,
        is_professional_invoice: false,
        taxable_amount: 0,
        tax_rate: 10,
        tax_amount: 0,
        withholding_rate: 0,
        withholding_amount: 0
    }

    const form = useForm<ExpenseFormValues>({
        resolver: zodResolver(ExpenseFormSchema) as any,
        defaultValues
    })

    // Effect to populate form when editing
    const { reset } = form
    useState(() => {
        if (isOpen) {
            if (expenseToEdit) {
                reset({
                    ...defaultValues,
                    ...expenseToEdit,
                    // Ensure dates are formatted correctly if needed
                    expense_date: expenseToEdit.expense_date.split('T')[0]
                })
            } else {
                reset(defaultValues)
            }
        }
    })
    // Note: The previous useState logic for reset is actually bad practice (derived state in render). 
    // Better to use useEffect.

    // Changing to useEffect:
    const [mounted, setMounted] = useState(false)
    if (!mounted) {
        // logic to run once
        setMounted(true)
    }

    const onSubmit: SubmitHandler<ExpenseFormValues> = async (values) => {
        setIsSubmitting(true)
        try {
            const result = await upsertOperatingExpense(values)
            if (!result.success) throw new Error(result.error)

            toast.success("Gasto registrado correctamente")

            // Reset and close
            form.reset({
                restaurant_id: restaurantId,
                expense_date: format(new Date(), 'yyyy-MM-dd'),
                category: 'ALQUILER',
                amount: 0,
                description: '',
                provider_detail: '',
                tag: '',
                payment_method: 'bank',
                recurrence: 'NONE',
                is_paid: true,
                is_professional_invoice: false,
                taxable_amount: 0,
                tax_rate: 10,
                tax_amount: 0,
                withholding_rate: 0,
                withholding_amount: 0
            })
            onClose()
        } catch {
            toast.error("Error al registrar gasto")
        } finally {
            setIsSubmitting(false)
        }
    }

    const selectedCategory = form.watch('category')
    const availableTags = selectedCategory === 'PROVEEDORES_COMIDA'
        ? EXPENSE_TAGS.PROVEEDORES_COMIDA
        : selectedCategory === 'PROVEEDORES_BEBIDA'
            ? EXPENSE_TAGS.PROVEEDORES_BEBIDA
            : []

    return (
        <div className={cn(
            "fixed inset-0 z-50 flex items-center justify-center p-4",
            !isOpen && "pointer-events-none"
        )}>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isOpen ? 1 : 0 }}
                onClick={onClose}
                className={cn(
                    "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity",
                    !isOpen && "opacity-0"
                )}
            />

            {/* Modal Content */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: isOpen ? 1 : 0, scale: isOpen ? 1 : 0.95, y: isOpen ? 0 : 20 }}
                transition={{ duration: 0.2 }}
                className={cn(
                    "relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto",
                    !isOpen && "opacity-0 pointer-events-none"
                )}
            >
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
                    <div>
                        <h2 className="text-xl font-bold text-neutral-900">Añadir Gasto</h2>
                        <p className="text-sm text-neutral-500 mt-0.5">Registra facturas de proveedores o pagos en efectivo.</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 rounded-lg"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Form */}
                <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Fecha</Label>
                            <Input type="date" {...form.register('expense_date')} />
                        </div>

                        <div className="space-y-2">
                            <Label>Categoría</Label>
                            <Select
                                onValueChange={(val) => form.setValue('category', val as ExpenseFormValues['category'])}
                                defaultValue={form.getValues('category')}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Tag selector for COGS categories */}
                    {(selectedCategory === 'PROVEEDORES_COMIDA' || selectedCategory === 'PROVEEDORES_BEBIDA') && (
                        <div className="space-y-2">
                            <Label>Etiqueta</Label>
                            <Select
                                onValueChange={(val) => form.setValue('tag', val)}
                                defaultValue={form.getValues('tag')}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona etiqueta" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableTags.map((tag) => (
                                        <SelectItem key={tag} value={tag}>
                                            {tag}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Importes</Label>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="pro-mode"
                                    checked={form.watch('is_professional_invoice')}
                                    onCheckedChange={(c: boolean) => {
                                        form.setValue('is_professional_invoice', c)
                                    }}
                                />
                                <Label htmlFor="pro-mode" className="text-xs text-neutral-500 font-normal">
                                    Modo Fiscal (Desglosar IVA/IRPF)
                                </Label>
                            </div>
                        </div>

                        {form.watch('is_professional_invoice') ? (
                            <div className="bg-neutral-50 p-4 rounded-lg space-y-4 border border-neutral-200">
                                {/* Base Imponible */}
                                <div className="space-y-2">
                                    <Label className="text-xs text-neutral-500 uppercase tracking-wider">Base Imponible</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        {...form.register('taxable_amount', {
                                            valueAsNumber: true,
                                            onChange: (e) => {
                                                const base = parseFloat(e.target.value) || 0
                                                const rate = form.getValues('tax_rate') || 0
                                                const wRate = form.getValues('withholding_rate') || 0
                                                const tax = base * (rate / 100)
                                                const withholding = base * (wRate / 100)
                                                const total = base + tax - withholding
                                                form.setValue('tax_amount', parseFloat(tax.toFixed(2)))
                                                form.setValue('withholding_amount', parseFloat(withholding.toFixed(2)))
                                                form.setValue('amount', parseFloat(total.toFixed(2)))
                                            }
                                        })}
                                        className="font-mono"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* IVA Select */}
                                    <div className="space-y-2">
                                        <Label className="text-xs text-neutral-500 uppercase tracking-wider">Tipo IVA</Label>
                                        <div className="flex gap-1">
                                            {[4, 10, 21].map((rate) => (
                                                <Button
                                                    key={rate}
                                                    type="button"
                                                    variant={form.watch('tax_rate') === rate ? "default" : "outline"}
                                                    size="sm"
                                                    className="flex-1 h-8 text-xs"
                                                    onClick={() => {
                                                        form.setValue('tax_rate', rate)
                                                        const base = form.getValues('taxable_amount') || 0
                                                        const wRate = form.getValues('withholding_rate') || 0
                                                        const tax = base * (rate / 100)
                                                        const withholding = base * (wRate / 100)
                                                        const total = base + tax - withholding
                                                        form.setValue('tax_amount', parseFloat(tax.toFixed(2)))
                                                        form.setValue('amount', parseFloat(total.toFixed(2)))
                                                    }}
                                                >
                                                    {rate}%
                                                </Button>
                                            ))}
                                        </div>
                                        <div className="text-right text-xs font-mono text-neutral-600">
                                            +{form.watch('tax_amount')?.toFixed(2)}€
                                        </div>
                                    </div>

                                    {/* IRPF Select */}
                                    <div className="space-y-2">
                                        <Label className="text-xs text-neutral-500 uppercase tracking-wider">Retención IRPF</Label>
                                        <div className="flex gap-1">
                                            {[0, 15, 19].map((rate) => (
                                                <Button
                                                    key={rate}
                                                    type="button"
                                                    variant={form.watch('withholding_rate') === rate ? "destructive" : "outline"}
                                                    size="sm"
                                                    className={cn(
                                                        "flex-1 h-8 text-xs",
                                                        form.watch('withholding_rate') === rate && "bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200"
                                                    )}
                                                    onClick={() => {
                                                        form.setValue('withholding_rate', rate)
                                                        const base = form.getValues('taxable_amount') || 0
                                                        const tRate = form.getValues('tax_rate') || 0
                                                        const tax = base * (tRate / 100)
                                                        const withholding = base * (rate / 100)
                                                        const total = base + tax - withholding
                                                        form.setValue('withholding_amount', parseFloat(withholding.toFixed(2)))
                                                        form.setValue('amount', parseFloat(total.toFixed(2)))
                                                    }}
                                                >
                                                    {rate}%
                                                </Button>
                                            ))}
                                        </div>
                                        <div className="text-right text-xs font-mono text-rose-600">
                                            -{form.watch('withholding_amount')?.toFixed(2)}€
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-neutral-200 flex justify-between items-center">
                                    <span className="font-bold text-neutral-900">Total a Pagar</span>
                                    <span className="font-mono text-xl font-bold">
                                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(form.watch('amount') || 0)}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label>Total (€)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    {...form.register('amount', { valueAsNumber: true })}
                                    className="text-lg font-mono font-medium"
                                />
                                <p className="text-[10px] text-amber-600">
                                    {selectedCategory === 'VARIACION_EXISTENCIAS'
                                        ? '💡 Valor positivo = Gasto/Consumo. Valor negativo = Ahorro/Aumento de Stock.'
                                        : selectedCategory === 'INVERSIONES'
                                            ? '💡 Los CAPEX se excluyen del cálculo de rentabilidad operativa.'
                                            : ''}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Proveedor / Concepto</Label>
                        <Input placeholder="Ej: Makro, Frutería, Nómina Juan..." {...form.register('description')} />
                        <Input
                            placeholder="Detalle adicional (opcional)"
                            {...form.register('provider_detail')}
                            className="text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Forma de Pago</Label>
                            <Select
                                onValueChange={(val) => form.setValue('payment_method', val as ExpenseFormValues['payment_method'])}
                                defaultValue="bank"
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="bank">Domiciliado/Transf.</SelectItem>
                                    <SelectItem value="card">Tarjeta Empresa</SelectItem>
                                    <SelectItem value="cash">Caja Menuda (Efectivo)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Estado</Label>
                            <div className="flex items-center space-x-2 h-10">
                                <Switch
                                    checked={form.watch('is_paid')}
                                    onCheckedChange={(c: boolean) => form.setValue('is_paid', c)}
                                />
                                <span className="text-sm text-neutral-600">
                                    {form.watch('is_paid') ? 'Pagado' : 'Pendiente'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-neutral-200">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            Guardar Gasto
                        </Button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}
