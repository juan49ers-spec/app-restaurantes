"use client"

import { useCallback, useEffect, useState } from "react"
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Users,
    Euro,
    Info
} from "lucide-react"
import { getEmployees, getShifts, upsertShift, deleteShift, getStaffingForecast, type DailyForecast } from "@/app/actions/staff"
import { format, startOfWeek, addDays, subWeeks, addWeeks, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
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
import { SkeletonTable } from "@/components/shared/LoadingSkeletons"
import { useMediaQuery } from "@/hooks/useMediaQuery"

interface ShiftBoardProps {
    restaurantId: string
}

export function ShiftBoard({ restaurantId }: ShiftBoardProps) {
    const isMobile = useMediaQuery('(max-width: 768px)')
    const [currentDate, setCurrentDate] = useState(new Date())
    const [employees, setEmployees] = useState<Employee[]>([])
    const [shifts, setShifts] = useState<Shift[]>([])
    const [forecasts, setForecasts] = useState<DailyForecast[]>([])
    const [loading, setLoading] = useState(true)
    const [mobileDayOffset, setMobileDayOffset] = useState(0)

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

    // Day to show in mobile
    const currentMobileDay = days[mobileDayOffset] || days[0]

    const startStr = format(startDate, 'yyyy-MM-dd')
    const endStr = format(endDate, 'yyyy-MM-dd')

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [staffRes, shiftsRes, forecastData] = await Promise.all([
                getEmployees(),
                getShifts(restaurantId, startStr, endStr),
                getStaffingForecast(restaurantId, startStr, endStr)
            ])

            if (staffRes.data) setEmployees(staffRes.data)
            if (shiftsRes.data) setShifts(shiftsRes.data)
            setForecasts(forecastData)
        } catch (err) {
            console.error("Error fetching board data:", err)
            toast.error("Error al cargar los datos del cuadrante")
        } finally {
            setLoading(false)
        }
    }, [restaurantId, startStr, endStr])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const nextWeek = () => {
        setCurrentDate(addWeeks(currentDate, 1))
        setMobileDayOffset(0)
    }
    const prevWeek = () => {
        setCurrentDate(subWeeks(currentDate, 1))
        setMobileDayOffset(0)
    }

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

            const result = await upsertShift(newShift as Shift)
            if (result.success) {
                toast.success("Turno duplicado al día siguiente")
                fetchData()
            } else {
                toast.error(result.error || "Error al duplicar turno")
            }
        } catch {
            toast.error("Error inesperado al duplicar turno")
        }
    }

    const handleDeleteShift = async (shift: Shift) => {
        if (!confirm("¿Eliminar este turno permanentemente?")) return

        try {
            if (shift.id) {
                const result = await deleteShift(shift.id)
                if (result.success) {
                    toast.success("Turno eliminado")
                    fetchData()
                } else {
                    toast.error(result.error || "No se pudo eliminar el turno")
                }
            }
        } catch {
            toast.error("Error inesperado al eliminar turno")
        }
    }

    // Calculate labor cost for the week
    const weeklyLaborCost = shifts.reduce((acc, shift) => {
        return acc + (shift.estimated_cost || 0)
    }, 0)

    // Calculate Project Weekly Sales
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
                toast.warning(`Cambio de Rol: ${sourceEmployee.role} ➝ ${targetEmployee.role}`)
            }

            // 2. Contract Hours Check
            const shiftDurationHours = (
                parseInt(shift.end_time.split(':')[0]) + parseInt(shift.end_time.split(':')[1]) / 60 -
                (parseInt(shift.start_time.split(':')[0]) + parseInt(shift.start_time.split(':')[1]) / 60)
            )

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
                toast.error(`Límite de Horas Excedido (${newTotal.toFixed(1)}h / ${maxHours}h)`)
            }
        }

        // Optimistic Update
        const originalShifts = [...shifts]
        const updatedShift = { ...shift, employee_id: targetEmployeeId, date: targetDate }
        setShifts(prev => prev.map(s => s.id === shift.id ? updatedShift : s))

        try {
            const result = await upsertShift(updatedShift)
            if (result.success) {
                toast.success("Turno movido correctamente")
                fetchData()
            } else {
                toast.error(result.error || "Error al mover el turno")
                setShifts(originalShifts)
            }
        } catch {
            toast.error("Error inesperado al mover el turno")
            setShifts(originalShifts)
        }
    }

    const setDemandFactor = (dateStr: string, factor: number) => {
        setDemandFactors(prev => ({ ...prev, [dateStr]: factor }))
    }

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b">
                    <div className="flex items-center gap-4 bg-card border rounded-lg p-1 shadow-sm overflow-hidden min-w-fit">
                        <button
                            onClick={prevWeek}
                            className="p-3 md:p-2 hover:bg-muted rounded-md transition-colors cursor-pointer"
                            aria-label="Semana anterior"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs md:text-sm font-bold px-2 md:px-4 uppercase tracking-tighter italic">
                            {format(startDate, 'dd MMM', { locale: es })} - {format(endDate, 'dd MMM, yyyy', { locale: es })}
                        </span>
                        <button
                            onClick={nextWeek}
                            className="p-3 md:p-2 hover:bg-muted rounded-md transition-colors cursor-pointer"
                            aria-label="Semana siguiente"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {isMobile && (
                        <div className="flex items-center justify-between gap-1 bg-muted/20 p-1 rounded-lg border w-full overflow-x-auto no-scrollbar">
                            {days.map((day, idx) => (
                                <button
                                    key={day.toISOString()}
                                    onClick={() => setMobileDayOffset(idx)}
                                    className={`flex-1 min-w-[40px] py-2 rounded-md transition-all flex flex-col items-center ${mobileDayOffset === idx ? 'bg-primary text-primary-foreground scale-105 shadow-sm' : 'hover:bg-muted bg-card'}`}
                                >
                                    <span className="text-[10px] font-black uppercase">{format(day, 'EE', { locale: es }).substring(0, 1)}</span>
                                    <span className="text-[8px] font-bold opacity-80">{format(day, 'dd')}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-2 items-center w-full md:w-auto">
                        <select
                            aria-label="Filtrar por rol"
                            className="flex-1 md:flex-none px-3 py-2 bg-card border rounded-lg text-xs font-bold uppercase tracking-wider outline-none"
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                        >
                            <option value="ALL">Roles</option>
                            {roles.map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>

                        <button
                            onClick={() => handleAddShift()}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-bold uppercase tracking-tighter shadow-sm text-xs"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Turno</span>
                        </button>
                    </div>
                </div>

                <div className="bg-card border rounded-2xl shadow-sm relative overflow-hidden">
                    <div className="overflow-x-scroll no-scrollbar">
                        <div className={`min-w-fit grid ${isMobile ? 'grid-cols-[100px_1fr]' : 'grid-cols-[140px_repeat(7,1fr)]'}`}>
                            {/* Header Row */}
                            <div className="p-3 border-r border-b flex items-center gap-2 font-black text-[10px] text-muted-foreground uppercase tracking-[0.2em] bg-card sticky left-0 z-50">
                                <Users className="w-3 h-3" />
                                <span>Personal</span>
                            </div>

                            {(isMobile ? [currentMobileDay] : days).map(day => {
                                const dateStr = format(day, 'yyyy-MM-dd')
                                const factor = demandFactors[dateStr] || 1.0

                                return (
                                    <div key={day.toISOString()} className="p-2 text-center border-b border-r last:border-r-0 flex flex-col items-center gap-1 min-w-[120px]">
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{format(day, 'EEEE', { locale: es })}</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-black italic tabular-nums ${isSameDay(day, new Date()) ? "text-primary bg-primary/10 px-2 py-0.5 rounded-full" : ""}`}>
                                                {format(day, 'dd MMM')}
                                            </span>
                                        </div>

                                        {/* Demand Toggle Mini */}
                                        <div className="flex gap-1 mt-1">
                                            {[0.8, 1.0, 1.2, 1.5].map(f => (
                                                <button
                                                    key={f}
                                                    onClick={() => setDemandFactor(dateStr, f)}
                                                    title={`Factor de demanda: ${f}`}
                                                    aria-label={`Establecer factor de demanda a ${f}`}
                                                    className={`w-3 h-3 rounded-full border transition-all ${factor === f ? 'scale-125 ring-2 ring-offset-1 ring-primary-foreground' : 'opacity-40'
                                                        } ${f === 0.8 ? 'bg-blue-300' :
                                                            f === 1.0 ? 'bg-gray-300' :
                                                                f === 1.2 ? 'bg-orange-300' : 'bg-purple-400'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}

                            {/* Body Rows */}
                            {loading ? (
                                <div className="col-span-full py-20 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
                                    <SkeletonTable rows={5} />
                                </div>
                            ) : (
                                filteredEmployees.map(employee => (
                                    <div key={employee.id} className="contents group">
                                        <div className="px-3 py-4 border-r border-b flex flex-col justify-center relative bg-card group-hover:bg-muted/5 sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: employee.color_code }} />
                                            <span className="text-[10px] font-black uppercase tracking-tight truncate pl-2 text-foreground/90">
                                                {employee.first_name}
                                            </span>
                                            <span className="text-[8px] font-bold text-muted-foreground pl-2 uppercase tracking-wider opacity-60">
                                                {employee.role}
                                            </span>
                                        </div>
                                        {(isMobile ? [currentMobileDay] : days).map(day => {
                                            const dayShifts = shifts.filter(s =>
                                                s.employee_id === employee.id &&
                                                s.date === format(day, 'yyyy-MM-dd')
                                            )
                                            return (
                                                <div key={`${employee.id}-${day.toISOString()}`} className="border-b border-r last:border-r-0 min-h-[70px] bg-white/50 group-hover:bg-muted/5 transition-colors">
                                                    <ShiftBoardCell
                                                        employee={employee}
                                                        day={day}
                                                        shifts={dayShifts}
                                                        checkConflict={checkConflict}
                                                        onAddShift={handleAddShift}
                                                        onContextMenu={handleContextMenu}
                                                    />
                                                </div>
                                            )
                                        })}
                                    </div>
                                ))
                            )}

                            {/* Financial Commander Bottom Row */}
                            <div className="p-3 border-r border-b flex items-center justify-end pr-4 font-black text-[9px] text-muted-foreground uppercase tracking-widest bg-muted/5 sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                Coste Dia
                            </div>
                            {(isMobile ? [currentMobileDay] : days).map(day => {
                                const dayTotalCost = shifts
                                    .filter(s => s.date === format(day, 'yyyy-MM-dd'))
                                    .reduce((acc, s) => acc + (s.estimated_cost || 0), 0)

                                return (
                                    <div key={`cost-${day.toISOString()}`} className="p-2 border-b border-r last:border-r-0 flex flex-col items-center justify-center bg-muted/5">
                                        <span className="text-[10px] font-black tabular-nums text-primary/80">
                                            {dayTotalCost.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Legend / Status */}
                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl">
                            <Euro className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h4 className="font-black italic uppercase tracking-tighter text-base md:text-lg">KPI Personal Semanal</h4>
                            <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                <Info className="w-3 h-3" />
                                Comparativa Inversión vs Proyección de Ventas
                            </p>
                        </div>
                    </div>
                    <div className="text-center md:text-right">
                        <div className="flex flex-col items-center md:items-end">
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl md:text-3xl font-black italic tracking-tighter tabular-nums text-primary">
                                    {weeklyLaborCost.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-xs font-bold text-muted-foreground opacity-60">
                                    / {weeklyProjectedSales.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })} Est.
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="h-1.5 w-32 md:w-48 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-500"
                                        style={{ width: `${Math.min((weeklyLaborCost / (weeklyProjectedSales || 1)) * 100, 100)}%` }}
                                    />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                                    {weeklyProjectedSales > 0 ? ((weeklyLaborCost / weeklyProjectedSales) * 100).toFixed(1) : 0}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modals & Overlays */}
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
            </div>
        </DndContext>
    )
}
