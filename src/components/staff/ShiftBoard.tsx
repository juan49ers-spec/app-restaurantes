"use client"

import { useCallback, useEffect, useState } from "react"
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Users,
    Clock,
    Euro,
    AlertCircle,
    Info
} from "lucide-react"
import { format, startOfWeek, addDays, subWeeks, addWeeks, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { getEmployees, getShifts, upsertShift, deleteShift, getStaffingForecast, DailyForecast } from "@/app/actions/staff-actions"
import type { Employee, Shift } from "@/types/schema"
import { ShiftForm } from "./ShiftForm"
import { toast } from "sonner"
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    TouchSensor,
    KeyboardSensor,
    DragStartEvent,
    DragEndEvent
} from "@dnd-kit/core"
import { ShiftBoardCell } from "./ShiftBoardCell"
import { ShiftCard } from "./ShiftCard"
import { ShiftContextMenuPortal } from "./ShiftContextMenuPortal"

interface ShiftBoardProps {
    restaurantId: string
}

export function ShiftBoard({ restaurantId }: ShiftBoardProps) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [employees, setEmployees] = useState<Employee[]>([])
    const [shifts, setShifts] = useState<Shift[]>([])
    const [forecasts, setForecasts] = useState<DailyForecast[]>([])
    const [loading, setLoading] = useState(true)

    // DnD State
    const [activeShift, setActiveShift] = useState<Shift | null>(null)

    // Form states
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingShift, setEditingShift] = useState<Partial<Shift> | undefined>()
    const [selectedDate, setSelectedDate] = useState<Date | undefined>()
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>()
    const [selectedRole, setSelectedRole] = useState<string>("ALL")

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, shift: Shift } | null>(null)

    // Demand Factors State (Local for MVP)
    const [demandFactors, setDemandFactors] = useState<Record<string, number>>({})

    const handleContextMenu = (event: React.MouseEvent, shift: Shift) => {
        event.preventDefault()
        setContextMenu({
            x: event.clientX,
            y: event.clientY,
            shift
        })
    }

    // Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor)
    )

    // Derived state
    const roles = Array.from(new Set(employees.map(e => e.role))).sort()
    const filteredEmployees = selectedRole === "ALL"
        ? employees
        : employees.filter(e => e.role === selectedRole)

    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 })
    const endDate = addDays(startDate, 6)
    const days = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i))

    const startStr = format(startDate, 'yyyy-MM-dd')
    const endStr = format(endDate, 'yyyy-MM-dd')

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [staffData, shiftsData, forecastData] = await Promise.all([
                getEmployees(restaurantId),
                getShifts(restaurantId, startStr, endStr),
                getStaffingForecast(restaurantId, startStr, endStr)
            ])
            setEmployees(staffData)
            setShifts(shiftsData)
            setForecasts(forecastData)
        } catch (err) {
            console.error("Error fetching board data:", err)
        } finally {
            setLoading(false)
        }
    }, [restaurantId, startStr, endStr])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1))
    const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1))

    const handleAddShift = (date?: Date, employeeId?: string) => {
        setEditingShift(undefined)
        setSelectedDate(date)
        setSelectedEmployeeId(employeeId)
        setIsFormOpen(true)
    }

    const handleEditShift = (shift: Shift) => {
        setEditingShift(shift)
        setIsFormOpen(true)
    }

    const handleDuplicateShift = async (shift: Shift) => {
        try {
            const currentShiftDate = new Date(shift.date)
            const nextDay = addDays(currentShiftDate, 1)

            const newShift = {
                ...shift,
                date: format(nextDay, 'yyyy-MM-dd'),
                id: undefined // Create new
            }

            await upsertShift(newShift as Shift)
            toast.success("Turno duplicado al día siguiente")
            fetchData()
        } catch {
            toast.error("Error al duplicar turno")
        }
    }

    const handleDeleteShift = async (shift: Shift) => {
        if (!confirm("¿Eliminar este turno permanentemente?")) return

        try {
            if (shift.id) {
                await deleteShift(shift.id)
                toast.success("Turno eliminado")
                fetchData()
            }
        } catch {
            toast.error("Error al eliminar turno")
        }
    }

    // --- POWER USER SHORTCUTS (Copy/Paste) ---
    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            // Copy: Ctrl+C
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                if (activeShift) { // If dragging
                    toast.info("Turno copiado al portapapeles")
                    return
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [activeShift])
    // -----------------------------------------

    // Calculate labor cost for the week
    const weeklyLaborCost = shifts.reduce((acc, shift) => {
        return acc + (shift.estimated_cost || 0)
    }, 0)

    // Calculate Project Weekly Sales (sum of daily projections adjusted by demand)
    const weeklyProjectedSales = forecasts.reduce((acc, day) => {
        const factor = demandFactors[day.date] || 1.0
        const sales = day.actualSales || (day.projectedSales * factor)
        return acc + sales
    }, 0)

    const checkConflict = (currentShift: Shift, dayShifts: Shift[]) => {
        const parseTime = (t: string) => {
            const [h, m] = t.split(':').map(Number)
            return h * 60 + m
        }

        const start = parseTime(currentShift.start_time)
        const end = parseTime(currentShift.end_time)

        return dayShifts.some(other => {
            if (other.id === currentShift.id) return false
            const otherStart = parseTime(other.start_time)
            const otherEnd = parseTime(other.end_time)
            return start < otherEnd && end > otherStart
        })
    }

    // DnD Handlers
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        const shift = active.data.current?.shift as Shift
        if (shift) {
            setActiveShift(shift)
        }
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        setActiveShift(null)

        if (!over) return

        const shift = active.data.current?.shift as Shift
        const { employeeId: targetEmployeeId, date: targetDate } = over.data.current as { employeeId: string, date: string }

        if (!shift || !targetEmployeeId || !targetDate) return

        if (shift.employee_id === targetEmployeeId && shift.date === targetDate) return

        // --- SMART VALIDATIONS ---
        const targetEmployee = employees.find(e => e.id === targetEmployeeId)
        const sourceEmployee = employees.find(e => e.id === shift.employee_id)

        if (targetEmployee && sourceEmployee) {
            // 1. Role Mismatch Warning
            if (targetEmployee.role !== sourceEmployee.role) {
                toast.warning(`Cambio de Rol: ${sourceEmployee.role} ➝ ${targetEmployee.role}`, {
                    description: "Verifica que el empleado pueda realizar esta función."
                })
            }

            // 2. Contract Hours Check
            const shiftDurationHours = (
                parseInt(shift.end_time.split(':')[0]) + parseInt(shift.end_time.split(':')[1]) / 60 -
                (parseInt(shift.start_time.split(':')[0]) + parseInt(shift.start_time.split(':')[1]) / 60)
            )

            // Calculate current weekly hours for target
            const weekShifts = shifts.filter(s => s.employee_id === targetEmployeeId)
            const currentWeeklyHours = weekShifts.reduce((acc, s) => {
                const duration = (
                    parseInt(s.end_time.split(':')[0]) + parseInt(s.end_time.split(':')[1]) / 60 -
                    (parseInt(s.start_time.split(':')[0]) + parseInt(s.start_time.split(':')[1]) / 60)
                )
                return acc + duration
            }, 0)

            const newTotal = currentWeeklyHours + shiftDurationHours
            const maxHours = targetEmployee.contract_hours_weekly || 40

            if (newTotal > maxHours) {
                toast.error(`Límite de Horas Excedido`, {
                    description: `${targetEmployee.first_name} pasará de ${currentWeeklyHours.toFixed(1)}h a ${newTotal.toFixed(1)}h (Máx: ${maxHours}h)`,
                    duration: 5000
                })
            }
        }
        // -------------------------

        // Optimistic Update
        const originalShifts = [...shifts]
        const updatedShift = { ...shift, employee_id: targetEmployeeId, date: targetDate }

        setShifts(prev => prev.map(s => s.id === shift.id ? updatedShift : s))

        try {
            await upsertShift(updatedShift)
            toast.success("Turno movido correctamente")
            // Fetch to update costs
            fetchData()
        } catch (error) {
            console.error("Failed to move shift", error)
            toast.error("Error al mover el turno")
            setShifts(originalShifts) // Revert
        }
    }

    const setDemandFactor = (dateStr: string, factor: number) => {
        setDemandFactors(prev => ({
            ...prev,
            [dateStr]: factor
        }))
    }

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b">
                    <div className="flex items-center gap-4 bg-card border rounded-lg p-1 shadow-sm">
                        <button
                            onClick={prevWeek}
                            className="p-2 hover:bg-muted rounded-md transition-colors"
                            aria-label="Semana anterior"
                            title="Semana anterior"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-bold px-4 uppercase tracking-tighter italic">
                            {format(startDate, 'dd MMM', { locale: es })} - {format(endDate, 'dd MMM, yyyy', { locale: es })}
                        </span>
                        <button
                            onClick={nextWeek}
                            className="p-2 hover:bg-muted rounded-md transition-colors"
                            aria-label="Semana siguiente"
                            title="Semana siguiente"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex gap-2 items-center">
                        <select
                            aria-label="Filtrar por rol"
                            className="px-3 py-2 bg-card border rounded-lg text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-primary/20"
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                        >
                            <option value="ALL">Todos los Roles</option>
                            {roles.map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>

                        <button
                            onClick={() => handleAddShift()}
                            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-bold uppercase tracking-tighter shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Asignar Turno</span>
                        </button>
                    </div>
                </div>

                <div className="bg-card border rounded-2xl overflow-hidden shadow-sm relative">
                    {/* Header Row */}
                    <div className="grid grid-cols-[140px_repeat(7,1fr)] bg-card sticky top-0 z-40 border-b shadow-sm ring-1 ring-border/5">
                        <div className="p-2 border-r flex items-center gap-2 font-black text-[10px] text-muted-foreground uppercase tracking-[0.2em] bg-card sticky left-0 z-50">
                            <Users className="w-3 h-3" />
                            <span>Personal</span>
                        </div>
                        {days.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd')
                            const factor = demandFactors[dateStr] || 1.0

                            return (
                                <div key={day.toISOString()} className="p-1.5 text-center border-r last:border-r-0 flex flex-col items-center gap-1 min-w-[80px]">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{format(day, 'EEE', { locale: es })}</span>
                                    <span className={`text-[10px] font-black italic tabular-nums ${isSameDay(day, new Date()) ? "text-primary scale-110" : ""}`}>
                                        {format(day, 'dd')}
                                    </span>

                                    {/* Demand Factor Toggle */}
                                    <div className="flex gap-0.5 mt-1">
                                        <button
                                            onClick={() => setDemandFactor(dateStr, 0.8)}
                                            className={`w-3 h-3 rounded-full border flex items-center justify-center transition-colors ${factor === 0.8 ? 'bg-blue-200 border-blue-400' : 'bg-transparent border-muted hover:bg-muted'}`}
                                            title="Baja demanda (0.8x)"
                                        >
                                            <span className="sr-only">Baja</span>
                                        </button>
                                        <button
                                            onClick={() => setDemandFactor(dateStr, 1.0)}
                                            className={`w-3 h-3 rounded-full border flex items-center justify-center transition-colors ${factor === 1.0 ? 'bg-gray-200 border-gray-400' : 'bg-transparent border-muted hover:bg-muted'}`}
                                            title="Demanda normal (1.0x)"
                                        >
                                            <span className="sr-only">Normal</span>
                                        </button>
                                        <button
                                            onClick={() => setDemandFactor(dateStr, 1.2)}
                                            className={`w-3 h-3 rounded-full border flex items-center justify-center transition-colors ${factor === 1.2 ? 'bg-orange-200 border-orange-400' : 'bg-transparent border-muted hover:bg-muted'}`}
                                            title="Alta demanda (1.2x)"
                                        >
                                            <span className="sr-only">Alta</span>
                                        </button>
                                        <button
                                            onClick={() => setDemandFactor(dateStr, 1.5)}
                                            className={`w-3 h-3 rounded-full border flex items-center justify-center transition-colors ${factor === 1.5 ? 'bg-purple-200 border-purple-400' : 'bg-transparent border-muted hover:bg-muted'}`}
                                            title="Evento (1.5x)"
                                        >
                                            <span className="sr-only">Evento</span>
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="divide-y relative min-h-[200px] overflow-x-auto">
                        {loading ? (
                            <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
                                <div className="flex items-center gap-2 text-primary">
                                    <Clock className="w-5 h-5 animate-spin" />
                                    <span className="font-bold uppercase tracking-tighter italic">Cargando Cuadrante...</span>
                                </div>
                            </div>
                        ) : null}

                        {filteredEmployees.map(employee => {
                            const indicatorStyle = { backgroundColor: employee.color_code };
                            return (
                                <div key={employee.id} className="grid grid-cols-[140px_repeat(7,1fr)] hover:bg-muted/5 transition-colors group border-b last:border-0">
                                    <div className="px-2 py-1.5 border-r flex flex-col justify-center relative bg-card group-hover:bg-muted/10 transition-colors whitespace-nowrap overflow-hidden sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">

                                        <div className="absolute left-0 top-0 bottom-0 w-1" style={indicatorStyle} />
                                        <span className="text-[10px] font-bold uppercase tracking-tight truncate pl-2 text-foreground/90">
                                            {employee.first_name} {employee.last_name}
                                        </span>
                                        <span className="text-[8px] font-semibold text-muted-foreground pl-2 uppercase tracking-wider opacity-70">
                                            {employee.role}
                                        </span>
                                    </div>
                                    {days.map(day => {
                                        const dayShifts = shifts.filter(s =>
                                            s.employee_id === employee.id &&
                                            s.date === format(day, 'yyyy-MM-dd')
                                        )
                                        return (
                                            <ShiftBoardCell
                                                key={day.toISOString()}
                                                employee={employee}
                                                day={day}
                                                shifts={dayShifts}
                                                checkConflict={checkConflict}
                                                onAddShift={handleAddShift}
                                                onContextMenu={handleContextMenu}
                                            />
                                        )
                                    })}
                                </div>
                            );
                        })}

                        {!loading && filteredEmployees.length === 0 && (
                            <div className="py-20 text-center col-span-full">
                                <AlertCircle className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                                <h3 className="font-bold text-muted-foreground uppercase tracking-tighter italic text-xl">Sin Personal Registrado</h3>
                                <p className="text-muted-foreground/60 text-sm">Debes añadir empleados al directorio antes de planificar turnos.</p>
                            </div>
                        )}

                        {/* --- FINANCIAL COMMAND CENTER --- */}
                        {/* 1. Daily Costs */}
                        <div className="grid grid-cols-[140px_repeat(7,1fr)] bg-card border-t sticky bottom-0 z-40 shadow-sm">
                            <div className="px-2 py-1.5 border-r flex flex-col justify-center text-right pr-4 bg-card sticky left-0 z-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Inversión Personal</span>
                            </div>
                            {days.map(day => {
                                const dayTotalCost = shifts
                                    .filter(s => s.date === format(day, 'yyyy-MM-dd'))
                                    .reduce((acc, s) => acc + (s.estimated_cost || 0), 0)

                                return (
                                    <div key={`cost-${day.toISOString()}`} className="p-1.5 border-r last:border-r-0 flex flex-col items-center justify-center gap-0.5 bg-muted/10">
                                        <span className="text-[10px] font-black tabular-nums text-primary/80">
                                            {dayTotalCost.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
                                        </span>
                                    </div>
                                )
                            })}
                        </div>

                        {/* 2. Projected Efficiency */}
                        <div className="grid grid-cols-[140px_repeat(7,1fr)] bg-card border-t border-dashed sticky bottom-8 z-40 ">
                            <div className="px-2 py-1.5 border-r flex flex-col justify-center text-right pr-4 bg-card sticky left-0 z-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Eficiencia (Obj: 30%)</span>
                            </div>
                            {days.map(day => {
                                const dateStr = format(day, 'yyyy-MM-dd')
                                const forecast = forecasts.find(f => f.date === dateStr)
                                const dayTotalCost = shifts
                                    .filter(s => s.date === dateStr)
                                    .reduce((acc, s) => acc + (s.estimated_cost || 0), 0)

                                const factor = demandFactors[dateStr] || 1.0
                                const projectedSales = forecast ? (forecast.actualSales ?? (forecast.projectedSales * factor)) : 0

                                const efficiency = projectedSales > 0 ? (dayTotalCost / projectedSales) * 100 : 0
                                const target = forecast?.targetLaborCostPct || 30

                                let statusColor = "bg-emerald-500"
                                if (efficiency > target + 5) statusColor = "bg-red-500"
                                else if (efficiency < target - 5 && efficiency > 0) statusColor = "bg-yellow-400"

                                return (
                                    <div key={`eff-${day.toISOString()}`} className="p-1.5 border-r last:border-r-0 flex flex-col items-center justify-center gap-1 bg-white">
                                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-full ${statusColor}`} style={{ width: `${Math.min(efficiency, 100)}%` }} />
                                        </div>
                                        <span className={`text-[9px] font-bold tabular-nums ${efficiency > target + 5 ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {efficiency.toFixed(1)}%
                                        </span>
                                        <span className="text-[8px] text-muted-foreground/60">
                                            de {projectedSales.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€
                                        </span>
                                    </div>
                                )
                            })}
                        </div>

                    </div>
                </div>

                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 rounded-full -mr-6 -mt-6" />
                            <Euro className="w-6 h-6 text-primary relative z-10" />
                        </div>
                        <div>
                            <h4 className="font-black italic uppercase tracking-tighter text-lg">Proyección Dinámica de Costos</h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                <Info className="w-3.5 h-3.5" />
                                <span>Inversión en personal semansa visible vs Proyección Ventas</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex flex-col items-end">
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-black italic tracking-tighter tabular-nums text-primary underline decoration-primary/20 underline-offset-8">
                                    {weeklyLaborCost.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
                                </span>
                                <span className="text-sm font-bold text-muted-foreground mb-1.5">
                                    / {weeklyProjectedSales.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€ Est.
                                </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em] mt-2">
                                Ratio Semanal: {weeklyProjectedSales > 0 ? ((weeklyLaborCost / weeklyProjectedSales) * 100).toFixed(1) : 0}%
                            </p>
                        </div>
                    </div>
                </div>
                {isFormOpen && (
                    <ShiftForm
                        restaurantId={restaurantId}
                        employees={employees}
                        shift={editingShift}
                        initialDate={selectedDate}
                        initialEmployeeId={selectedEmployeeId}
                        onClose={() => setIsFormOpen(false)}
                        onSuccess={() => {
                            setIsFormOpen(false)
                            fetchData()
                        }}
                    />
                )}
            </div>

            <DragOverlay>
                {activeShift ? (
                    <ShiftCard
                        shift={activeShift}
                        employeeColor={employees.find(e => e.id === activeShift.employee_id)?.color_code || "#ccc"}
                        hasConflict={false}
                        onContextMenu={() => { }}
                        isOverlay={true}
                    />
                ) : null}
            </DragOverlay>

            {contextMenu && (
                <ShiftContextMenuPortal
                    x={contextMenu.x}
                    y={contextMenu.y}
                    shift={contextMenu.shift}
                    onClose={() => setContextMenu(null)}
                    onEdit={handleEditShift}
                    onDuplicate={handleDuplicateShift}
                    onDelete={handleDeleteShift}
                />
            )}
        </DndContext>
    )
}
