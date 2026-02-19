"use client"

import { useCallback, useEffect, useState } from "react"
import {
    BookOpen,
    Search,
    Plus,
    FileText,
    AlertCircle,
    Info,
    Clock,
    CheckCircle2,
    ShieldAlert
} from "lucide-react"
import { getPolicies, type Policy } from "@/app/actions/policy-actions"
import { PolicyForm } from "./PolicyForm"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface PolicyBoardProps {
    restaurantId: string
}

const CATEGORY_LABELS: Record<string, string> = {
    OPERATIONS: "Operaciones",
    HYGIENE: "Higiene y Seguridad",
    SERVICE: "Estándares de Servicio",
    HR: "Recursos Humanos",
    SAFETY: "Seguridad Laboral",
}

export function PolicyBoard({ restaurantId }: PolicyBoardProps) {
    const [policies, setPolicies] = useState<Policy[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

    // Form states
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingPolicy, setEditingPolicy] = useState<Partial<Policy> | undefined>()

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const data = await getPolicies(restaurantId)
            setPolicies(data)
        } catch (err) {
            console.error("Error fetching policies:", err)
        } finally {
            setLoading(false)
        }
    }, [restaurantId])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleAddPolicy = () => {
        setEditingPolicy(undefined)
        setIsFormOpen(true)
    }

    const handleEditPolicy = (policy: Policy) => {
        setEditingPolicy(policy)
        setIsFormOpen(true)
    }

    const filteredPolicies = policies.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs">
                        <BookOpen className="w-4 h-4" />
                        <span>Cumplimiento & Normativa</span>
                    </div>
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter">Políticas del Restaurante</h2>
                </div>

                <button
                    onClick={handleAddPolicy}
                    className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-black uppercase tracking-tighter shadow-lg italic"
                >
                    <Plus className="w-5 h-5" />
                    <span>Nueva Política</span>
                </button>
            </header>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Buscar por título o categoría..."
                    className="w-full pl-10 pr-4 py-3 bg-card border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative min-h-[400px]">
                {loading && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-2xl">
                        <div className="flex items-center gap-2 text-primary">
                            <Clock className="w-5 h-5 animate-spin" />
                            <span className="font-bold uppercase tracking-tighter italic text-xl">Cargando Normativa...</span>
                        </div>
                    </div>
                )}

                {filteredPolicies.map((policy) => (
                    <div
                        key={policy.id}
                        onClick={() => handleEditPolicy(policy)}
                        className="group bg-card border rounded-2xl p-6 hover:shadow-xl hover:border-primary/30 transition-all flex flex-col cursor-pointer relative overflow-hidden active:scale-[0.98]"
                        title={`Ver o editar política: ${policy.title}`}
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150" />

                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div className="p-3 bg-muted rounded-xl group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 px-2 py-1 bg-muted/50 rounded-lg">
                                    {CATEGORY_LABELS[policy.category] || policy.category}
                                </span>
                                {policy.is_required && (
                                    <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                        Obligatoria
                                    </span>
                                )}
                            </div>
                        </div>

                        <h3 className="font-black italic text-xl uppercase tracking-tighter mb-3 group-hover:text-primary transition-colors flex-1">
                            {policy.title}
                        </h3>

                        <p className="text-sm text-muted-foreground line-clamp-2 mb-6 font-medium leading-relaxed">
                            {policy.description || "Sin descripción detallada."}
                        </p>

                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 pt-4 border-t border-dashed">
                            <div className="flex items-center gap-1.5 text-primary/60">
                                <Info className="w-3.5 h-3.5" />
                                <span>Ver Detalle</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{policy.created_at ? format(new Date(policy.created_at), 'dd MMM yyyy', { locale: es }) : "Reciente"}</span>
                            </div>
                        </div>
                    </div>
                ))}

                {!loading && filteredPolicies.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-muted/10 border-2 border-dashed rounded-2xl">
                        <AlertCircle className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                        <h3 className="font-black italic uppercase tracking-tighter text-2xl text-muted-foreground/40">Sin Políticas Registradas</h3>
                        <p className="text-muted-foreground/60 font-medium">Comienza a formalizar tu operativa añadiendo tu primera política.</p>
                    </div>
                )}
            </div>

            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm">
                <div className="p-4 bg-primary/10 rounded-2xl">
                    <ShieldAlert className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-1 text-center md:text-left flex-1">
                    <h4 className="font-black italic uppercase tracking-tighter text-xl text-primary">Cumplimiento Normativo Activo</h4>
                    <p className="text-sm text-muted-foreground font-medium max-w-2xl">
                        Las políticas marcadas como <span className="text-primary font-bold">obligatorias</span> requieren una firma digital de lectura por parte de cada empleado.
                        Mantén tu restaurante protegido legalmente mediante un control estricto de protocolos.
                    </p>
                </div>
            </div>

            {isFormOpen && (
                <PolicyForm
                    restaurantId={restaurantId}
                    policy={editingPolicy}
                    onClose={() => setIsFormOpen(false)}
                    onSuccess={() => {
                        setIsFormOpen(false)
                        fetchData()
                    }}
                />
            )}
        </div>
    )
}
