"use client"

import { useState } from "react"
import {
    X,
    Save,
    User,
    Briefcase,
    AlertCircle,
    ShieldAlert,
    Info
} from "lucide-react"
import { SmartNumberInput } from "@/components/ui/smart-number-input"
import type { Employee, StaffRole, ContractType } from "@/types/schema"
import { upsertEmployee } from "@/app/actions/staff-actions"

interface EmployeeFormProps {
    restaurantId: string
    employee?: Partial<Employee>
    onClose: () => void
    onSuccess: () => void
}

// Explicitly typed constants to avoid inference issues
const ROLES: { value: StaffRole; label: string }[] = [
    { value: 'MANAGEMENT', label: 'Gerencia' },
    { value: 'KITCHEN_HEAD', label: 'Jefe de Cocina' },
    { value: 'KITCHEN_STAFF', label: 'Cocina' },
    { value: 'FLOOR_MANAGER', label: 'Maître / Encargado' },
    { value: 'FLOOR_STAFF', label: 'Sala' },
    { value: 'BAR_STAFF', label: 'Barra' },
    { value: 'CLEANING', label: 'Limpieza' },
    { value: 'ADMIN', label: 'Administración' },
    { value: 'OTHER', label: 'Otros' }
]

const CONTRACTS: { value: ContractType; label: string }[] = [
    { value: 'INDEFINIDO', label: 'Indefinido' },
    { value: 'TEMPORAL', label: 'Temporal' },
    { value: 'PRACTICAS', label: 'Prácticas' },
    { value: 'AUTONOMO', label: 'Autónomo' },
    { value: 'OTRO', label: 'Otro' }
]

// Backward compatibility for legacy data
const LEGACY_ROLE_MAP: Record<string, StaffRole> = {
    "Gerencia": "MANAGEMENT",
    "Jefe de Cocina": "KITCHEN_HEAD",
    "Cocina": "KITCHEN_STAFF",
    "Maître / Encargado": "FLOOR_MANAGER",
    "Maître": "FLOOR_MANAGER",
    "Encargado": "FLOOR_MANAGER",
    "Sala": "FLOOR_STAFF",
    "Barra": "BAR_STAFF",
    "Limpieza": "CLEANING",
    "Administración": "ADMIN",
    "Otros": "OTHER"
}

// Hostelry Industry Collective Agreement 2024-2025 reference
// Based on Spanish "Convenio Colectivo de Hostelería"
const HOURLY_RATE_SUGGESTIONS: Record<StaffRole, { min: number; max: number; description: string }> = {
    MANAGEMENT: {
        min: 16.00,
        max: 22.00,
        description: "Gerencia/Dirección"
    },
    KITCHEN_HEAD: {
        min: 14.50,
        max: 19.00,
        description: "Jefe de Cocina (Grupo I)"
    },
    KITCHEN_STAFF: {
        min: 11.50,
        max: 14.00,
        description: "Cocinero/a (Grupo III)"
    },
    FLOOR_MANAGER: {
        min: 13.00,
        max: 16.00,
        description: "Maître/Encargado (Grupo II)"
    },
    FLOOR_STAFF: {
        min: 10.50,
        max: 12.50,
        description: "Camarero/a (Grupo IV)"
    },
    BAR_STAFF: {
        min: 11.00,
        max: 13.50,
        description: "Personal de Barra"
    },
    CLEANING: {
        min: 10.50,
        max: 12.00,
        description: "Personal de Limpieza"
    },
    ADMIN: {
        min: 12.00,
        max: 15.00,
        description: "Administrativo"
    },
    OTHER: {
        min: 9.84,
        max: 12.00,
        description: "Otros perfiles (SMI 2025)"
    }
}

export function EmployeeForm({ restaurantId, employee, onClose, onSuccess }: EmployeeFormProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Sanitize role on init
    const initialRole: StaffRole = (() => {
        const rawRole = employee?.role as string | undefined
        if (!rawRole) return 'FLOOR_STAFF'

        // precise match
        const validRoles = ROLES.map(r => r.value) as string[]
        if (validRoles.includes(rawRole)) return rawRole as StaffRole

        // legacy match
        if (LEGACY_ROLE_MAP[rawRole]) return LEGACY_ROLE_MAP[rawRole]

        return 'OTHER'
    })()

    // Sanitize contract_type on init
    const initialContract: ContractType = (() => {
        const rawContract = employee?.contract_type as string | undefined
        if (!rawContract) return 'INDEFINIDO'

        const validContracts = CONTRACTS.map(c => c.value) as string[]
        if (validContracts.includes(rawContract)) return rawContract as ContractType

        // Try uppercase match
        const upper = rawContract.toUpperCase()
        if (validContracts.includes(upper)) return upper as ContractType

        return 'OTRO'
    })()

    const [formData, setFormData] = useState<Partial<Employee>>({
        restaurant_id: restaurantId,
        first_name: employee?.first_name || "",
        last_name: employee?.last_name || "",
        role: initialRole,
        hourly_rate: employee?.hourly_rate || 0,
        monthly_base_salary: employee?.monthly_base_salary || 0,
        contract_type: initialContract,
        contract_hours_weekly: employee?.contract_hours_weekly || 40,
        phone: employee?.phone || "",
        email: employee?.email || "",
        emergency_contact: employee?.emergency_contact || "",
        social_security_number: employee?.social_security_number || "",
        is_active: employee?.is_active ?? true,
        id: employee?.id
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        // Debug logging to catch values before submission
        console.log("Submitting Employee Data:", formData)

        try {
            await upsertEmployee(formData as Employee)
            onSuccess()
        } catch (err: unknown) {
            console.error("Error saving employee:", err)
            // Use z.error map if available, or fallback
            // parsing simplified error for Zod if it comes as JSON string
            let errorMsg = "Error al guardar el empleado"

            if (err instanceof Error) {
                // Check if it's a JSON error array (Zod)
                try {
                    const parsed = JSON.parse(err.message)
                    if (Array.isArray(parsed) && parsed[0]?.message) {
                        // Zod error format: [{... message: "...", path: [...]}]
                        errorMsg = `${parsed[0].path?.join('.')}: ${parsed[0].message}`
                        if (parsed[0].received) {
                            errorMsg += ` (Recibido: ${parsed[0].received})`
                        }
                    } else {
                        errorMsg = err.message
                    }
                } catch {
                    errorMsg = err.message
                }
            }
            setError(errorMsg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <header className="px-5 py-3 border-b flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                            <User className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold italic uppercase tracking-tighter">
                            {formData.id ? "Editar Ficha Profesional" : "Nueva Incorporación"}
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

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
                    {error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex items-center gap-2 text-sm break-words">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* SECCIÓN 1: DATOS PERSONALES */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <User className="w-3.5 h-3.5" />
                            Información Personal
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label htmlFor="first_name" className="text-sm font-medium">Nombre</label>
                                <div className="relative">
                                    <input
                                        id="first_name"
                                        required
                                        className="w-full px-3 py-1.5 bg-background border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        placeholder="Ej. Ana"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="last_name" className="text-sm font-medium">Apellidos</label>
                                <input
                                    id="last_name"
                                    required
                                    className="w-full px-3 py-1.5 bg-background border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm"
                                    value={formData.last_name}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                    placeholder="Ej. Torres"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label htmlFor="phone" className="text-sm font-medium">Teléfono</label>
                                <input
                                    id="phone"
                                    className="w-full px-3 py-1.5 bg-background border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="email" className="text-sm font-medium">Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    className="w-full px-3 py-1.5 bg-background border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 2: CONTRATO Y ROL */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <Briefcase className="w-3.5 h-3.5" />
                            Contratación y Rol
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label htmlFor="role" className="text-sm font-medium">Cargo / Puesto</label>
                                <select
                                    id="role"
                                    aria-label="Seleccionar puesto"
                                    className="w-full px-3 py-1.5 bg-background border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm appearance-none"
                                    value={formData.role}
                                    onChange={(e) => {
                                        console.log("Role changed to:", e.target.value);
                                        setFormData({ ...formData, role: e.target.value as StaffRole })
                                    }}
                                >
                                    {ROLES.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="contract_type" className="text-sm font-medium">Tipo de Contrato</label>
                                <select
                                    id="contract_type"
                                    aria-label="Seleccionar tipo de contrato"
                                    className="w-full px-3 py-1.5 bg-background border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm appearance-none"
                                    value={formData.contract_type}
                                    onChange={(e) => setFormData({ ...formData, contract_type: e.target.value as ContractType })}
                                >
                                    {CONTRACTS.map(c => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <label htmlFor="hours" className="text-sm font-medium">Horas/Semana</label>
                                <SmartNumberInput
                                    id="hours"
                                    className="w-full px-3 py-1.5 bg-background border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm"
                                    value={formData.contract_hours_weekly}
                                    onValueChange={(val) => setFormData({ ...formData, contract_hours_weekly: val })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="salary" className="text-sm font-medium">Sueldo Base Mensual</label>
                                <div className="relative">
                                    <SmartNumberInput
                                        id="salary"
                                        className="w-full pl-7 pr-3 py-1.5 bg-background border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm"
                                        value={formData.monthly_base_salary}
                                        onValueChange={(val) => setFormData({ ...formData, monthly_base_salary: val })}
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">€</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="hourly_rate" className="text-sm font-medium">Coste/Hora (Empresa)</label>
                                <div className="relative">
                                    <SmartNumberInput
                                        id="hourly_rate"
                                        className="w-full pl-7 pr-3 py-1.5 bg-background border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm"
                                        value={formData.hourly_rate}
                                        onValueChange={(val) => setFormData({ ...formData, hourly_rate: val })}
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">€</span>
                                </div>

                                {formData.role && HOURLY_RATE_SUGGESTIONS[formData.role] && (
                                    <div className="mt-1.5 flex items-center justify-between p-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                                        <div className="flex items-center gap-2">
                                            <Info className="w-3.5 h-3.5 text-blue-700 dark:text-blue-300" />
                                            <span className="text-[10px] font-medium uppercase tracking-tight text-blue-700 dark:text-blue-300">Rango Convenio 2025</span>
                                        </div>
                                        <div className="text-xs font-mono font-medium text-foreground">
                                            {HOURLY_RATE_SUGGESTIONS[formData.role].min.toFixed(2)}€ - {HOURLY_RATE_SUGGESTIONS[formData.role].max.toFixed(2)}€
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN 3: COMPLIANCE & SEGURIDAD */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Cumplimiento y Seguridad
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label htmlFor="nss" className="text-sm font-medium italic">Número Seguridad Social</label>
                                <input
                                    id="nss"
                                    placeholder="NSS"
                                    className="w-full px-3 py-1.5 bg-muted/50 border border-dashed rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm"
                                    value={formData.social_security_number}
                                    onChange={(e) => setFormData({ ...formData, social_security_number: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="emergency" className="text-sm font-medium italic">Contacto Emergencia</label>
                                <input
                                    id="emergency"
                                    placeholder="Nombre y Teléfono"
                                    className="w-full px-3 py-1.5 bg-muted/50 border border-dashed rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm"
                                    value={formData.emergency_contact}
                                    onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </form>

                <footer className="px-5 py-3 border-t bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is_active"
                            className="w-4 h-4 rounded border-muted text-primary focus:ring-primary/20"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        />
                        <label htmlFor="is_active" className="text-sm font-medium">Empleado Activo</label>
                    </div>
                    <div className="flex gap-3">
                        <button
                            disabled={loading}
                            onClick={onClose}
                            className="px-4 py-2 border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={loading}
                            onClick={handleSubmit}
                            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-bold uppercase tracking-tighter disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            <span>{loading ? "Guardando..." : "Registrar"}</span>
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    )
}
