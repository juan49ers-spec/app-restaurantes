"use client"

import { useState, useMemo, useCallback } from "react"
import { m, AnimatePresence } from "framer-motion"
import {
    Search,
    Users,
    UserPlus,
    Settings2,
    Mail,
    Phone,
    Euro,
    Scale
} from "lucide-react"
import { Employee } from "@/types/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { EmployeeModal } from "@/components/staff/EmployeeModal"
import { EmployeesCsvImportPanel } from "@/components/staff/EmployeesCsvImportPanel"
import { toggleEmployeeStatus } from "@/app/actions/staff"
import { toast } from "sonner"

interface ClientEmployeesViewProps {
    initialEmployees: Employee[]
    restaurantId: string
}

export function ClientEmployeesView({ initialEmployees, restaurantId }: ClientEmployeesViewProps) {
    const [employees, setEmployees] = useState(initialEmployees)
    const [search, setSearch] = useState("")
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>()
    const [isToggling, setIsToggling] = useState<string | null>(null)

    // Filtrado memoizado
    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase()
            return fullName.includes(search.toLowerCase()) ||
                emp.role.toLowerCase().includes(search.toLowerCase())
        })
    }, [employees, search])

    // KPIs Rápidos
    const stats = useMemo(() => {
        const active = employees.filter(e => e.status === 'ACTIVE')
        const totalWage = active.reduce((sum, e) => {
            if (e.wage_type === 'SALARIED') return sum + (e.monthly_base_salary || 0)
            if (e.wage_type === 'HOURLY') return sum + (e.hourly_rate * 160) // Estimación mensual
            return sum + (e.monthly_base_salary || 0) + (e.hourly_rate * 20) // Mixed
        }, 0)

        return {
            total: employees.length,
            active: active.length,
            estMonthlyCost: totalWage
        }
    }, [employees])

    const handleToggleStatus = useCallback(async (emp: Employee) => {
        setIsToggling(emp.id!)
        const result = await toggleEmployeeStatus(emp.id!, emp.status)

        if (result.success) {
            setEmployees(prev => prev.map(e =>
                e.id === emp.id
                    ? { ...e, status: e.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }
                    : e
            ))
            toast.success(`Estado de ${emp.first_name} actualizado`)
        } else {
            toast.error(result.error || "Error al cambiar estado")
        }
        setIsToggling(null)
    }, [])

    const openEditModal = (emp: Employee) => {
        setEditingEmployee(emp)
        setIsModalOpen(true)
    }

    const handleModalClose = () => {
        setIsModalOpen(false)
        setEditingEmployee(undefined)
    }

    return (
        <div className="max-w-5xl mx-auto p-4 space-y-6 animate-in fade-in duration-700">
            {/* Header Zen */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                        <Users className="w-6 h-6 text-indigo-600" />
                        Equipo
                    </h1>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">
                        Gestión de Personal • {stats.active} Activos
                    </p>
                </div>

                <div className="flex w-full md:w-auto items-center gap-2">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar..."
                            className="pl-9 bg-white/50 border-slate-200/60 focus:bg-white transition-all rounded-xl h-10 text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button
                        onClick={() => setIsModalOpen(true)}
                        className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200 h-10 px-4 group"
                    >
                        <UserPlus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                        <span className="hidden sm:inline">Nuevo</span>
                    </Button>
                </div>
            </header>

            {/* Stats Cards Modernas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: "Total Plantilla", val: stats.total, icon: Users, color: "text-blue-600" },
                    { label: "Activos Hoy", val: stats.active, icon: Scale, color: "text-emerald-600" },
                    { label: "Coste Est. Mensual", val: `${stats.estMonthlyCost.toLocaleString()}€`, icon: Euro, color: "text-indigo-600" },
                ].map((stat, i) => (
                    <Card key={i} className="border-none bg-white/40 backdrop-blur-sm shadow-sm hover:shadow-md transition-all rounded-2xl border border-white/60">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className={cn("p-3 rounded-xl bg-white shadow-sm", stat.color)}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{stat.label}</p>
                                <p className="text-xl font-black text-slate-900">{stat.val}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <EmployeesCsvImportPanel />

            {/* Employee List - Zen Mode Desktop */}
            <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                    {filteredEmployees.length > 0 ? (
                        filteredEmployees.map((emp) => (
                            <m.div
                                layout
                                key={emp.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={cn(
                                    "group flex items-center gap-4 p-3 bg-white/80 hover:bg-white border border-slate-100 hover:border-indigo-100 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-lg",
                                    emp.status === 'INACTIVE' && "opacity-60 saturate-50"
                                )}
                            >
                                {/* Avatar Compacto */}
                                <div
                                    className="h-10 w-10 flex-shrink-0 rounded-xl shadow-inner flex items-center justify-center text-white font-bold dyn-bg"
                                    ref={(el) => { if (el) el.style.setProperty('--dyn-bg', emp.color_code) }}
                                >
                                    {emp.first_name[0]}{emp.last_name[0]}
                                </div>

                                {/* Info Principal */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-900 truncate">{emp.first_name} {emp.last_name}</h3>
                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                                            {emp.role.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        {emp.email && (
                                            <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                                <Mail className="w-3 h-3" />
                                                <span className="truncate max-w-[120px]">{emp.email}</span>
                                            </div>
                                        )}
                                        {emp.phone && (
                                            <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                                <Phone className="w-3 h-3" />
                                                <span>{emp.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Wage Info Zen */}
                                <div className="hidden md:flex flex-col items-end px-4">
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-tighter">Compensación</p>
                                    <p className="font-bold text-sm text-slate-700">
                                        {emp.wage_type === 'HOURLY' ? `${emp.hourly_rate}€/h` : `${emp.monthly_base_salary}€/mes`}
                                    </p>
                                </div>

                                {/* Acciones Rápidas */}
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            "h-8 text-[10px] font-black rounded-lg transition-all",
                                            emp.status === 'ACTIVE'
                                                ? "text-emerald-600 hover:text-rose-600 hover:bg-rose-50"
                                                : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                        )}
                                        disabled={isToggling === emp.id}
                                        onClick={() => handleToggleStatus(emp)}
                                    >
                                        {isToggling === emp.id ? "..." : emp.status === 'ACTIVE' ? "ACTIVO" : "INACTIVO"}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                                        onClick={() => openEditModal(emp)}
                                    >
                                        <Settings2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </m.div>
                        ))
                    ) : (
                        <div className="py-20 text-center space-y-3">
                            <div className="bg-slate-50 w-16 h-16 rounded-3xl mx-auto flex items-center justify-center">
                                <Users className="w-8 h-8 text-slate-300" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-900">No hay personal que coincida</p>
                                <p className="text-sm text-slate-500">Prueba con otro término o crea un nuevo empleado.</p>
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Modal de Empleado */}
            <EmployeeModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                employee={editingEmployee}
                restaurantId={restaurantId}
                onSuccess={(updatedEmp) => {
                    if (editingEmployee) {
                        setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e))
                    } else {
                        setEmployees(prev => [...prev, updatedEmp])
                    }
                    handleModalClose()
                }}
            />
        </div>
    )
}
