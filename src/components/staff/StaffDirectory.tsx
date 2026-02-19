"use client"

import { useState, useEffect, useCallback } from "react"
import {
    Users,
    Search,
    UserPlus,
    Circle,
    Edit2,
    Trash2,
    Calendar,
    Phone,
    Euro,
    AlertCircle
} from "lucide-react"
import type { Employee, StaffRole, ContractType } from "@/types/schema"
import { getEmployees, deleteEmployee } from "@/app/actions/staff-actions"
import { EmployeeForm } from "./EmployeeForm"

interface StaffDirectoryProps {
    restaurantId: string
}

const ROLE_LABELS: Record<StaffRole, string> = {
    MANAGEMENT: "Gerencia",
    KITCHEN_HEAD: "Jefe de Cocina",
    KITCHEN_STAFF: "Cocina",
    FLOOR_MANAGER: "Maître / Encargado",
    FLOOR_STAFF: "Sala",
    BAR_STAFF: "Barra",
    CLEANING: "Limpieza",
    ADMIN: "Administración",
    OTHER: "Otros"
}

const CONTRACT_LABELS: Record<ContractType, string> = {
    INDEFINIDO: "Indefinido",
    TEMPORAL: "Temporal",
    PRACTICAS: "Prácticas",
    AUTONOMO: "Autónomo",
    OTRO: "Otro"
}

export function StaffDirectory({ restaurantId }: StaffDirectoryProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [employees, setEmployees] = useState<Employee[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined)

    const fetchEmployees = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await getEmployees(restaurantId)
            setEmployees(data)
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Error al cargar el equipo"
            setError(msg)
            console.error("Error fetching employees:", err)
        } finally {
            setLoading(false)
        }
    }, [restaurantId])

    useEffect(() => {
        fetchEmployees()
    }, [fetchEmployees])

    const handleDelete = async (id: string) => {
        if (confirm("¿Estás seguro de eliminar a este empleado? Esta acción no se puede deshacer.")) {
            try {
                await deleteEmployee(id)
                fetchEmployees()
            } catch (err) {
                console.error("Error deleting employee:", err)
            }
        }
    }

    const filteredStaff = employees.filter(s =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ROLE_LABELS[s.role].toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <div className="flex-1">
                        <p className="font-bold text-sm">Error al cargar datos</p>
                        <p className="text-xs opacity-80">{error}</p>
                    </div>
                    <button onClick={fetchEmployees} className="text-xs font-bold uppercase tracking-wider px-3 py-1 border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors">Reintentar</button>
                </div>
            )}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o cargo..."
                        className="w-full pl-9 pr-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => {
                        setEditingEmployee(undefined)
                        setIsFormOpen(true)
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-bold uppercase tracking-tighter"
                >
                    <UserPlus className="w-4 h-4" />
                    <span>Añadir Profesional</span>
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-muted/40 rounded-xl border border-dashed" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredStaff.map((staff) => {
                        const indicatorStyle = { backgroundColor: staff.color_code };
                        return (
                            <div key={staff.id} className="group bg-card border rounded-xl p-5 hover:shadow-md transition-all relative overflow-hidden flex flex-col">
                                {/* Color bar indicator */}
                                <div
                                    className="absolute top-0 left-0 w-full h-1"
                                    style={indicatorStyle}
                                />

                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xl font-black text-muted-foreground border italic">
                                            {staff.first_name.charAt(0)}{staff.last_name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg leading-tight uppercase tracking-tighter tabular-nums">
                                                {staff.first_name} {staff.last_name}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-primary uppercase tracking-widest px-2 py-0.5 bg-primary/5 rounded border border-primary/10">
                                                    {ROLE_LABELS[staff.role]}
                                                </span>
                                                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                                    {CONTRACT_LABELS[staff.contract_type]}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => {
                                                setEditingEmployee(staff)
                                                setIsFormOpen(true)
                                            }}
                                            className="p-1.5 hover:bg-muted rounded text-muted-foreground transition-colors"
                                            title="Editar ficha"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => staff.id && handleDelete(staff.id)}
                                            className="p-1.5 hover:bg-destructive/10 rounded text-destructive transition-colors"
                                            title="Eliminar empleado"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2.5 pt-4 border-t text-xs flex-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Euro className="w-3.5 h-3.5" />
                                            <span>Coste Empresa:</span>
                                        </div>
                                        <span className="font-mono font-bold">{(staff.hourly_rate || 0).toFixed(2)}€/h</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>Horas Contrato:</span>
                                        </div>
                                        <span className="font-mono font-bold">{staff.contract_hours_weekly}h/sem</span>
                                    </div>
                                    {staff.phone && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Phone className="w-3.5 h-3.5" />
                                                <span>Contacto:</span>
                                            </div>
                                            <span className="font-mono">{staff.phone}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-5 flex items-center justify-between pt-3 border-t">
                                    <div className="flex items-center gap-2">
                                        <Circle className={`w-2.5 h-2.5 ${staff.is_active ? "text-emerald-500 fill-emerald-500" : "text-rose-500 fill-rose-500"}`} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                            {staff.is_active ? "En Activo" : "Baja Temporal"}
                                        </span>
                                    </div>
                                    {staff.monthly_base_salary && staff.monthly_base_salary > 0 && (
                                        <div className="text-right">
                                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.2em]">Base Mensual</p>
                                            <p className="font-mono font-black text-sm">{staff.monthly_base_salary.toLocaleString()}€</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {filteredStaff.length === 0 && (
                        <div className="col-span-full py-16 text-center bg-muted/20 border border-dashed rounded-xl">
                            <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                            <h3 className="font-bold text-muted-foreground uppercase tracking-tighter text-xl italic">No se encontraron profesionales</h3>
                            <p className="text-muted-foreground/60 text-sm mt-1">Asegúrate de haber registrado al equipo de este restaurante.</p>
                        </div>
                    )}
                </div>
            )}

            {isFormOpen && (
                <EmployeeForm
                    restaurantId={restaurantId}
                    employee={editingEmployee}
                    onClose={() => setIsFormOpen(false)}
                    onSuccess={() => {
                        setIsFormOpen(false)
                        fetchEmployees()
                    }}
                />
            )}
        </div>
    )
}
