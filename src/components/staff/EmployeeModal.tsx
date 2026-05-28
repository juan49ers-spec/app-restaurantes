"use client"

import { useEffect, useState } from "react"
import { Resolver, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription
} from "@/components/ui/form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Employee, EmployeeSchema } from "@/types/schema"
import { upsertEmployee } from "@/app/actions/staff-directory"
import { toast } from "sonner"
import { Loader2, Palette } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmployeeModalProps {
    isOpen: boolean
    onClose: () => void
    employee?: Employee
    restaurantId: string
    onSuccess: (emp: Employee) => void
}

const ROLES = [
    { value: 'MANAGEMENT', label: 'Gerencia' },
    { value: 'KITCHEN_HEAD', label: 'Jefe de Cocina' },
    { value: 'KITCHEN_STAFF', label: 'Cocinero/Pinche' },
    { value: 'FLOOR_MANAGER', label: 'Metre / Jefe de Sala' },
    { value: 'FLOOR_STAFF', label: 'Camarero' },
    { value: 'BAR_STAFF', label: 'Barman' },
    { value: 'CLEANING', label: 'Limpieza' },
    { value: 'ADMIN', label: 'Administración' },
    { value: 'OTHER', label: 'Otros' },
]

const COLORS = [
    "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#8b5cf6", "#14b8a6", "#27272a"
]

type EmployeeFormValues = z.infer<typeof EmployeeSchema>

export function EmployeeModal({ isOpen, onClose, employee, restaurantId, onSuccess }: EmployeeModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<EmployeeFormValues>({
        resolver: zodResolver(EmployeeSchema) as unknown as Resolver<EmployeeFormValues>,
        defaultValues: {
            restaurant_id: restaurantId,
            first_name: "",
            last_name: "",
            role: 'OTHER',
            system_access_level: 'NONE',
            status: 'ACTIVE',
            contract_type: 'INDEFINIDO',
            wage_type: 'HOURLY',
            hourly_rate: 0,
            monthly_base_salary: 0,
            contract_hours_weekly: 40,
            color_code: COLORS[0],
            email: "",
            phone: "",
            social_security_number: "",
            emergency_contact: ""
        }
    })

    // Resetear formulario cuando cambia el empleado o se abre para nuevo
    useEffect(() => {
        if (isOpen) {
            if (employee) {
                form.reset({
                    ...employee,
                    email: employee.email || "",
                    phone: employee.phone || "",
                    social_security_number: employee.social_security_number || "",
                    emergency_contact: employee.emergency_contact || "",
                    system_access_level: employee.system_access_level || 'NONE'
                })
            } else {
                form.reset({
                    restaurant_id: restaurantId,
                    first_name: "",
                    last_name: "",
                    role: 'OTHER',
                    system_access_level: 'NONE',
                    status: 'ACTIVE',
                    contract_type: 'INDEFINIDO',
                    wage_type: 'HOURLY',
                    hourly_rate: 0,
                    monthly_base_salary: 0,
                    contract_hours_weekly: 40,
                    color_code: COLORS[Math.floor(Math.random() * COLORS.length)],
                    email: "",
                    phone: "",
                    social_security_number: "",
                    emergency_contact: ""
                })
            }
        }
    }, [isOpen, employee, restaurantId, form])

    const onSubmit = async (values: EmployeeFormValues) => {
        setIsSubmitting(true)
        const result = await upsertEmployee(values as Employee)

        if (result.success && result.data) {
            toast.success(employee ? "Empleado actualizado" : "Empleado creado")
            onSuccess(result.data)
        } else {
            toast.error(result.error || "Error al procesar")
        }
        setIsSubmitting(false)
    }

    const wageType = useWatch({
        control: form.control,
        name: "wage_type",
    })

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                <div className="bg-slate-900 p-6 text-white relative">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black">{employee ? "Editar Ficha" : "Añadir al Equipo"}</DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs uppercase tracking-widest font-bold">
                            Configuración y Costes del Personal
                        </DialogDescription>
                    </DialogHeader>
                    <div className="absolute top-6 right-6 opacity-20">
                        <Palette className="w-12 h-12" />
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6 bg-white overflow-y-auto max-h-[70vh]">
                        {/* Sección: Identificación */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="first_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-black text-slate-500 uppercase">Nombre</FormLabel>
                                        <FormControl>
                                            <Input {...field} className="rounded-xl border-slate-200" placeholder="Ej: Juan" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="last_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-black text-slate-500 uppercase">Apellidos</FormLabel>
                                        <FormControl>
                                            <Input {...field} className="rounded-xl border-slate-200" placeholder="Ej: Pérez" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Sección: Rol y Color */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-black text-slate-500 uppercase">Puesto</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="rounded-xl border-slate-200">
                                                    <SelectValue placeholder="Seleccionar puesto" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {ROLES.map(role => (
                                                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="color_code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-black text-slate-500 uppercase">Identificador Visual</FormLabel>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {COLORS.map(color => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    title={`Seleccionar color ${color}`}
                                                    className={cn(
                                                        "w-6 h-6 rounded-lg transition-all ring-offset-2",
                                                        field.value === color ? "ring-2 ring-slate-900 scale-110" : "hover:scale-110"
                                                    )}
                                                    style={{ backgroundColor: color }}
                                                    onClick={() => field.onChange(color)}
                                                />
                                            ))}
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Sección: Salarios */}
                        <div className="p-4 bg-slate-50 rounded-2xl space-y-4 border border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Modelo de Retribución</h4>
                                <FormField
                                    control={form.control}
                                    name="wage_type"
                                    render={({ field }) => (
                                        <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                                            {['HOURLY', 'SALARIED', 'MIXED'].map((type) => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    className={cn(
                                                        "px-3 py-1 text-[9px] font-black rounded-lg transition-all",
                                                        field.value === type ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600"
                                                    )}
                                                    onClick={() => field.onChange(type)}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {(wageType === 'HOURLY' || wageType === 'MIXED') && (
                                    <FormField
                                        control={form.control}
                                        name="hourly_rate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold text-slate-600">Precio Hora (€)</FormLabel>
                                                <FormControl>
                                                    <Input {...field} type="number" step="0.01" className="rounded-xl border-slate-200" onChange={e => field.onChange(parseFloat(e.target.value))} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                                {(wageType === 'SALARIED' || wageType === 'MIXED') && (
                                    <FormField
                                        control={form.control}
                                        name="monthly_base_salary"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold text-slate-600">Sueldo Base Mensual (€)</FormLabel>
                                                <FormControl>
                                                    <Input {...field} type="number" step="0.01" className="rounded-xl border-slate-200" onChange={e => field.onChange(parseFloat(e.target.value))} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Sección: Acceso al Sistema */}
                        <FormField
                            control={form.control}
                            name="system_access_level"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-black text-slate-500 uppercase">Privilegios ControlHub</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="rounded-xl border-slate-200">
                                                <SelectValue placeholder="Nivel de acceso" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="NONE">Sin acceso a la App</SelectItem>
                                            <SelectItem value="STAFF">Staff (Ver turnos propios)</SelectItem>
                                            <SelectItem value="MANAGER">Manager (Gestión operativa)</SelectItem>
                                            <SelectItem value="ADMIN">Admin (Visión total de costes)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription className="text-[10px]">
                                        Define qué podrá ver y hacer este empleado si le invitas al sistema.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <Button
                                variant="ghost"
                                type="button"
                                onClick={onClose}
                                className="rounded-xl text-slate-500"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white min-w-[120px]"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (employee ? "Guardar Cambios" : "Crear Empleado")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
