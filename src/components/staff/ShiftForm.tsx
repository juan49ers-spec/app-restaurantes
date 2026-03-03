"use client"

import { useState } from "react"
import {
    X,
    Save,
    Clock,
    User,
    Euro,
    AlertCircle,
    Coffee,
    Trash2
} from "lucide-react"
import type { Employee, Shift, ShiftType } from "@/types/schema"
import { upsertShift, deleteShift } from "@/app/actions/staff"
import { format } from "date-fns"

interface ShiftFormProps {
    restaurantId: string
    employees: Employee[]
    shift?: Partial<Shift>
    initialDate?: Date
    initialEmployeeId?: string
    onClose: () => void
    onSuccess: () => void
}

const SHIFT_TYPES: { value: ShiftType; label: string }[] = [
    { value: 'DESAYUNO', label: 'Desayuno' },
    { value: 'ALMUERZO', label: 'Almuerzo' },
    { value: 'CENA', label: 'Cena' },
    { value: 'EVENTO', label: 'Evento' },
    { value: 'OTRO', label: 'Personalizado' },
]

export function ShiftForm({
    restaurantId,
    employees,
    shift,
    initialDate,
    initialEmployeeId,
    onClose,
    onSuccess
}: ShiftFormProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState<Partial<Shift>>({
        restaurant_id: restaurantId,
        employee_id: shift?.employee_id || initialEmployeeId || (employees.length > 0 ? employees[0].id : ""),
        date: shift?.date || (initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')),
        start_time: shift?.start_time || "09:00",
        end_time: shift?.end_time || "17:00",
        break_minutes: shift?.break_minutes || 0,
        shift_type: shift?.shift_type || 'ALMUERZO',
        status: shift?.status || 'scheduled',
        notes: shift?.notes || "",
        id: shift?.id
    })

    const calculateEstimatedCost = () => {
        const employee = employees.find(e => e.id === formData.employee_id)
        if (!employee) return 0

        const [startH, startM] = (formData.start_time || "00:00").split(':').map(Number)
        const [endH, endM] = (formData.end_time || "00:00").split(':').map(Number)

        let diffHours = (endH + endM / 60) - (startH + startM / 60)
        if (diffHours < 0) diffHours += 24

        const breakHours = (formData.break_minutes || 0) / 60
        const actualWorkHours = Math.max(0, diffHours - breakHours)

        const hourlyRate = employee.hourly_rate || 0
        return actualWorkHours * hourlyRate
    }

    const getEmployeeHourlyRate = () => {
        const employee = employees.find(e => e.id === formData.employee_id)
        return employee?.hourly_rate || 0
    }

    const handleDelete = async () => {
        if (!formData.id) return
        if (!confirm("¿Estás seguro de eliminar este turno?")) return

        setLoading(true)
        setError(null)
        try {
            const result = await deleteShift(formData.id, restaurantId)
            if (result.success) {
                onSuccess()
            } else {
                setError(result.error || "No se pudo eliminar el turno")
            }
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : "Error inesperado al eliminar el turno"
            setError(errorMsg)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const estimated_cost = calculateEstimatedCost()
            const result = await upsertShift({
                ...formData,
                estimated_cost
            } as Shift)

            if (result.success) {
                onSuccess()
            } else {
                setError(result.error || "Error al guardar el turno")
            }
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : "Error inesperado al guardar el turno"
            setError(errorMsg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <header className="px-6 py-4 border-b flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                            <Clock className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-black italic uppercase tracking-tighter">
                            {formData.id ? "Modificar Turno" : "Asignación de Turno"}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                        title="Cerrar formulario"
                        aria-label="Cerrar formulario"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-center gap-2 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label htmlFor="employee" className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <User className="w-3 h-3" />
                                Colaborador
                            </label>
                            <select
                                id="employee"
                                className="w-full px-3 py-2 bg-background border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm"
                                value={formData.employee_id}
                                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                                required
                            >
                                <option value="" disabled>Seleccionar empleado</option>
                                {employees.map(e => (
                                    <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.role})</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label htmlFor="date" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Fecha</label>
                                <input
                                    id="date"
                                    type="date"
                                    className="w-full px-3 py-2 bg-background border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="shift_type" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tipo</label>
                                <select
                                    id="shift_type"
                                    className="w-full px-3 py-2 bg-background border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm"
                                    value={formData.shift_type}
                                    onChange={(e) => setFormData({ ...formData, shift_type: e.target.value as ShiftType })}
                                >
                                    {SHIFT_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label htmlFor="start_time" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Entrada</label>
                                <input
                                    id="start_time"
                                    type="time"
                                    className="w-full px-3 py-2 bg-background border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm"
                                    value={formData.start_time}
                                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="end_time" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Salida</label>
                                <input
                                    id="end_time"
                                    type="time"
                                    className="w-full px-3 py-2 bg-background border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm"
                                    value={formData.end_time}
                                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="break" className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <Coffee className="w-3 h-3" />
                                Tiempo de Descanso (minutos)
                            </label>
                            <input
                                id="break"
                                type="number"
                                className="w-full px-3 py-2 bg-background border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm"
                                value={formData.break_minutes}
                                onChange={(e) => setFormData({ ...formData, break_minutes: Number(e.target.value) })}
                            />
                        </div>

                        <div className="p-4 bg-muted/20 border border-dashed rounded-xl flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Euro className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Inversión Estimada</span>
                                </div>
                                {getEmployeeHourlyRate() === 0 && (
                                    <div className="flex items-center gap-1 text-amber-600 text-xs">
                                        <AlertCircle className="w-3 h-3" />
                                        <span>Sin coste/hora configurado</span>
                                    </div>
                                )}
                            </div>
                            <span className="text-lg font-black italic tracking-tighter tabular-nums text-primary">
                                {calculateEstimatedCost().toLocaleString('es-ES', { minimumFractionDigits: 2 })}€
                            </span>
                        </div>
                    </div>
                </form>

                <footer className="px-6 py-4 border-t bg-muted/30 flex items-center justify-between">
                    <div>
                        {formData.id && (
                            <button
                                type="button"
                                disabled={loading}
                                onClick={handleDelete}
                                className="flex items-center gap-1.5 text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-colors text-xs font-black uppercase tracking-widest"
                                title="Eliminar este turno permanentemente"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Eliminar
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            disabled={loading}
                            onClick={onClose}
                            className="px-4 py-2 border rounded-lg hover:bg-muted transition-colors text-sm font-bold uppercase tracking-tighter italic"
                        >
                            Descartar
                        </button>
                        <button
                            disabled={loading}
                            onClick={handleSubmit}
                            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-black uppercase tracking-tighter italic shadow-lg"
                        >
                            <Save className="w-4 h-4" />
                            <span>{loading ? "Calculando..." : "Confirmar Turno"}</span>
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    )
}
