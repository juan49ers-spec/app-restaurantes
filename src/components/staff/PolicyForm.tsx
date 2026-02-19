"use client"

import { useState } from "react"
import {
    X,
    Save,
    BookOpen,
    Tag,
    AlertCircle,
    CheckCircle2,
    Trash2
} from "lucide-react"
import { upsertPolicy, deletePolicy, type Policy } from "@/app/actions/policy-actions"

interface PolicyFormProps {
    restaurantId: string
    policy?: Partial<Policy>
    onClose: () => void
    onSuccess: () => void
}

const CATEGORIES = [
    { value: 'OPERATIONS', label: 'Operaciones' },
    { value: 'HYGIENE', label: 'Higiene y Seguridad' },
    { value: 'SERVICE', label: 'Estándares de Servicio' },
    { value: 'HR', label: 'Recursos Humanos' },
    { value: 'SAFETY', label: 'Seguridad Laboral' },
]

export function PolicyForm({
    restaurantId,
    policy,
    onClose,
    onSuccess
}: PolicyFormProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState<Partial<Policy>>({
        restaurant_id: restaurantId,
        title: policy?.title || "",
        description: policy?.description || "",
        category: policy?.category || "OPERATIONS",
        is_required: policy?.is_required ?? true,
        id: policy?.id
    })

    const handleDelete = async () => {
        if (!formData.id) return
        if (!confirm("¿Estás seguro de eliminar esta política?")) return

        setLoading(true)
        try {
            await deletePolicy(formData.id)
            onSuccess()
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : "Error al eliminar la política"
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
            await upsertPolicy({
                ...formData
            } as Policy)
            onSuccess()
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : "Error al guardar la política"
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
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-black italic uppercase tracking-tighter">
                            {formData.id ? "Editar Política" : "Nueva Política"}
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
                            <label htmlFor="title" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Título de la Política</label>
                            <input
                                id="title"
                                type="text"
                                className="w-full px-3 py-2 bg-background border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Ej: Protocolo de Cierre de Caja"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="category" className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <Tag className="w-3 h-3" />
                                Categoría
                            </label>
                            <select
                                id="category"
                                className="w-full px-3 py-2 bg-background border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono text-sm"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                required
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="description" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Descripción / Contenido</label>
                            <textarea
                                id="description"
                                rows={6}
                                className="w-full px-3 py-2 bg-background border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe los puntos clave de la normativa..."
                            />
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-muted/20 border border-dashed rounded-xl">
                            <input
                                type="checkbox"
                                id="is_required"
                                className="w-4 h-4 text-primary bg-background border-muted rounded focus:ring-primary/20"
                                checked={formData.is_required}
                                onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                            />
                            <label htmlFor="is_required" className="text-sm font-bold flex items-center gap-2 cursor-pointer">
                                <CheckCircle2 className={`w-4 h-4 ${formData.is_required ? "text-primary" : "text-muted-foreground/30"}`} />
                                Lectura Obligatoria para el Personal
                            </label>
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
                                title="Eliminar esta política permanentemente"
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
                            <span>{loading ? "Guardando..." : "Confirmar Política"}</span>
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    )
}
