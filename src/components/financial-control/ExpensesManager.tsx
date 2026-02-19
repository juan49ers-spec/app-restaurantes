"use client"

import { useState } from "react"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
    Plus,
    Trash2,
    FileText,
    CreditCard,
    Banknote,
    Landmark,
    EyeOff,
    Eye,
    Receipt,
    Loader2
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { OperatingExpense, OperatingExpenseCategory, EXPENSE_CATEGORY_LABELS, EXPENSE_TAGS, OperatingExpenseCategorySchema } from "@/types/schema"
import { upsertOperatingExpense, deleteOperatingExpense } from "@/app/actions/financial-control"

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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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

interface ExpensesManagerProps {
    restaurantId: string
    expenses: OperatingExpense[]
}

export function ExpensesManager({ restaurantId, expenses }: ExpensesManagerProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDiscreetMode, setIsDiscreetMode] = useState(false)

    const form = useForm<ExpenseFormValues>({
        resolver: zodResolver(ExpenseFormSchema) as any,
        defaultValues: {
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
    })

    const onSubmit: SubmitHandler<ExpenseFormValues> = async (values) => {
        setIsSubmitting(true)
        try {
            const result = await upsertOperatingExpense(values)
            if (!result.success) throw new Error(result.error)

            toast.success("Gasto registrado correctamente")
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
        } catch {
            toast.error("Error al registrar gasto")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de borrar este gasto?")) return
        try {
            await deleteOperatingExpense(id)
            toast.success("Gasto eliminado")
        } catch {
            toast.error("Error al eliminar")
        }
    }

    // Filter list based on visibility mode
    // We treat 'GASTOS_EN_MANO' as "Discreet" items effectively
    const visibleExpenses = isDiscreetMode
        ? expenses
        : expenses.filter(e => e.category !== 'GASTOS_EN_MANO')

    // Get tags for selected category
    const selectedCategory = form.watch('category')
    const availableTags = selectedCategory === 'PROVEEDORES_COMIDA'
        ? EXPENSE_TAGS.PROVEEDORES_COMIDA
        : selectedCategory === 'PROVEEDORES_BEBIDA'
            ? EXPENSE_TAGS.PROVEEDORES_BEBIDA
            : []

    return (
        <div className="grid lg:grid-cols-12 gap-6">

            {/* Form Column */}
            <div className="lg:col-span-4 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Añadir Factura / Gasto</CardTitle>
                        <CardDescription>Registra facturas de proveedores o pagos en efectivo.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                                                        // Auto-calculate logic
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
                                                                // Recalculate
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
                                                                // Recalculate
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

                            <Button type="submit" className="w-full mt-4" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                Guardar Gasto
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Upload Placeholder */}
                <div className="border-2 border-dashed border-neutral-200 rounded-xl p-8 flex flex-col items-center text-center text-neutral-400 bg-neutral-50/50 hover:bg-neutral-50 transition-colors">
                    <FileText className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm font-medium text-neutral-900">Arrastra Facturas Aquí</p>
                    <p className="text-xs mt-1">Soporte OCR próximamente</p>
                </div>
            </div>

            {/* List Column */}
            <div className="lg:col-span-8">
                <Card className="h-full flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Listado de Gastos</CardTitle>
                            <CardDescription>Gastos de este mes.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                {isDiscreetMode ? "Ver Todo" : "Solo Oficial"}
                            </span>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setIsDiscreetMode(!isDiscreetMode)}
                                className={cn(
                                    "transition-all",
                                    isDiscreetMode ? "bg-purple-50 border-purple-200 text-purple-700" : "text-neutral-500"
                                )}
                            >
                                {isDiscreetMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto">
                        {visibleExpenses.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-neutral-400">
                                <Receipt className="w-12 h-12 mb-4 opacity-20" />
                                <p>No hay gastos todavía este mes.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Concepto</TableHead>
                                        <TableHead>Partida</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {visibleExpenses.map((expense) => {
                                        const isDiscreet = expense.category === 'GASTOS_EN_MANO'
                                        const isNegative = expense.amount < 0

                                        return (
                                            <TableRow key={expense.id} className={cn(
                                                isDiscreet && "bg-purple-50/50 hover:bg-purple-50",
                                                isNegative && "bg-emerald-50/50 hover:bg-emerald-50"
                                            )}>
                                                <TableCell className="font-mono text-sm text-neutral-500">
                                                    {format(new Date(expense.expense_date), 'dd MMM', { locale: es })}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium text-neutral-900">
                                                        {expense.description || expense.provider_detail || '-'}
                                                        {expense.tag && (
                                                            <span className="ml-1.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px]">
                                                                {expense.tag}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-0.5">
                                                        {expense.payment_method === 'card' && <CreditCard className="w-3 h-3" />}
                                                        {expense.payment_method === 'cash' && <Banknote className="w-3 h-3" />}
                                                        {expense.payment_method === 'bank' && <Landmark className="w-3 h-3" />}
                                                        <span>{expense.payment_method}</span>
                                                        <span className="mx-1">•</span>
                                                        <span className={expense.is_paid ? "text-emerald-600" : "text-amber-600"}>
                                                            {expense.is_paid ? "Pagado" : "Pendiente"}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className={cn(
                                                        "text-[10px] font-normal",
                                                        isDiscreet ? "bg-purple-100 text-purple-700" : "bg-neutral-100 text-neutral-600",
                                                        isNegative ? "bg-emerald-100 text-emerald-700" : ""
                                                    )}>
                                                        {EXPENSE_CATEGORY_LABELS[expense.category]}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className={cn(
                                                            "font-mono font-bold",
                                                            isNegative ? "text-emerald-600" : "text-neutral-900"
                                                        )}>
                                                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(expense.amount))}
                                                        </span>
                                                        {expense.tax_amount ? (
                                                            <div className="flex gap-1 mt-0.5">
                                                                <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1 rounded border border-emerald-100 font-mono">
                                                                    IVA {expense.tax_rate}%
                                                                </span>
                                                                {expense.withholding_amount ? (
                                                                    <span className="text-[9px] text-rose-600 bg-rose-50 px-1 rounded border border-rose-100 font-mono">
                                                                        IRPF {expense.withholding_rate}%
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[9px] text-neutral-400 font-mono">Sin IVA desglosado</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-neutral-400 hover:text-red-600"
                                                        onClick={() => handleDelete(expense.id!)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
