'use client'

import { useState } from 'react'
import { Megaphone, Send, Trash2, Calendar, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { createBroadcast, deleteBroadcast } from '@/app/actions/broadcasts'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Broadcast {
    id: string
    title: string
    content: string
    severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS'
    expires_at: string
    created_at: string
}

interface Props {
    initialBroadcasts: Broadcast[]
}

export function BroadcastCenter({ initialBroadcasts }: Props) {
    const [broadcasts, setBroadcasts] = useState(initialBroadcasts)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        severity: 'INFO' as const,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week default
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const res = await createBroadcast({
                ...formData,
                target_type: 'ALL',
                expires_at: new Date(formData.expires_at).toISOString()
            })

            if (res.success) {
                toast.success('Anuncio enviado correctamente')
                setFormData({
                    title: '',
                    content: '',
                    severity: 'INFO',
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                })
                // Refresh local list (ideally we should fetch again or use the returned data if createBroadcast returned the item)
                window.location.reload()
            } else {
                toast.error('Error al enviar el anuncio')
            }
        } catch (error) {
            toast.error('Ocurrió un error inesperado')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este anuncio?')) return

        try {
            const res = await deleteBroadcast(id)
            if (res.success) {
                setBroadcasts(prev => prev.filter(b => b.id !== id))
                toast.success('Anuncio eliminado')
            }
        } catch (error) {
            toast.error('Error al eliminar')
        }
    }

    const getSeverityStyles = (severity: string) => {
        switch (severity) {
            case 'CRITICAL': return 'text-red-400 bg-red-500/10 border-red-500/20'
            case 'WARNING': return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
            case 'SUCCESS': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
            default: return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
        }
    }

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'CRITICAL': return <AlertCircle className="w-4 h-4" />
            case 'WARNING': return <AlertCircle className="w-4 h-4" />
            case 'SUCCESS': return <CheckCircle2 className="w-4 h-4" />
            default: return <Info className="w-4 h-4" />
        }
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Create Broadcast Form */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                            <Megaphone className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Nuevo Anuncio Global</h2>
                            <p className="text-xs text-neutral-400">Se mostrará a todos los usuarios de la red</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Título</label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                                placeholder="Ej: Mantenimiento programado"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Mensaje</label>
                            <textarea
                                required
                                rows={3}
                                value={formData.content}
                                onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all resize-none"
                                placeholder="Escribe el contenido del anuncio..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Gravedad</label>
                                <select
                                    value={formData.severity}
                                    onChange={e => setFormData(prev => ({ ...prev, severity: e.target.value as any }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                                >
                                    <option value="INFO">Informativo (Azul)</option>
                                    <option value="SUCCESS">Éxito (Verde)</option>
                                    <option value="WARNING">Advertencia (Naranja)</option>
                                    <option value="CRITICAL">Crítico (Rojo)</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Expira el</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.expires_at}
                                    onChange={e => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all mt-4"
                        >
                            {isSubmitting ? 'Enviando...' : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Publicar Anuncio
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Active Broadcasts List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            Anuncios Activos
                            <span className="text-[10px] px-2 py-0.5 bg-white/10 rounded-full text-neutral-400 font-normal">
                                {broadcasts.length}
                            </span>
                        </h3>
                    </div>

                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                        {broadcasts.length === 0 ? (
                            <div className="text-center py-12 bg-white/5 border border-dashed border-white/10 rounded-2xl">
                                <Megaphone className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
                                <p className="text-sm text-neutral-500">No hay anuncios activos</p>
                            </div>
                        ) : (
                            broadcasts.map(b => (
                                <div key={b.id} className="bg-white/5 border border-white/10 rounded-xl p-4 group">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border", getSeverityStyles(b.severity))}>
                                                    {getSeverityIcon(b.severity)}
                                                    {b.severity}
                                                </div>
                                                <h4 className="font-bold text-white text-sm truncate">{b.title}</h4>
                                            </div>
                                            <p className="text-xs text-neutral-400 line-clamp-2">{b.content}</p>
                                            <div className="flex items-center gap-3 mt-3 text-[10px] text-neutral-500">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    Expira: {new Date(b.expires_at).toLocaleDateString()}
                                                </div>
                                                <div className="w-1 h-1 bg-neutral-700 rounded-full" />
                                                <div>{new Date(b.created_at).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(b.id)}
                                            className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
