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
        <div className="flex flex-col h-full">
            {/* Create Broadcast Form */}
            <div className="p-5 border-b border-white/5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
                        <Megaphone className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white">Nuevo Anuncio</h2>
                        <p className="text-[10px] text-neutral-400">Visible para toda la red</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="space-y-1.5">
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
                            placeholder="Título del anuncio..."
                        />
                    </div>

                    <div className="space-y-1.5">
                        <textarea
                            required
                            rows={2}
                            value={formData.content}
                            onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all resize-none"
                            placeholder="Contenido..."
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select
                            aria-label="Gravedad del anuncio"
                            value={formData.severity}
                            onChange={e => setFormData(prev => ({ ...prev, severity: e.target.value as any }))}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
                        >
                            <option value="INFO">Info</option>
                            <option value="SUCCESS">Éxito</option>
                            <option value="WARNING">Advert.</option>
                            <option value="CRITICAL">Urgente</option>
                        </select>

                        <input
                            type="date"
                            aria-label="Fecha de expiración"
                            required
                            value={formData.expires_at}
                            onChange={e => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all [color-scheme:dark]"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed font-medium py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all mt-1"
                    >
                        {isSubmitting ? 'Enviando...' : (
                            <>
                                <Send className="w-3.5 h-3.5" />
                                Publicar
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Active Broadcasts List */}
            <div className="p-5 flex-1 flex flex-col min-h-[200px] max-h-[350px]">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                        Activos
                        <span className="text-[9px] px-1.5 py-0.5 bg-white/10 rounded-full text-neutral-400 font-normal">
                            {broadcasts.length}
                        </span>
                    </h3>
                </div>

                <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar flex-1">
                    {broadcasts.length === 0 ? (
                        <div className="text-center py-8 bg-white/5 border border-dashed border-white/10 rounded-xl h-full flex flex-col items-center justify-center">
                            <Megaphone className="w-6 h-6 text-neutral-700 mb-2" />
                            <p className="text-xs text-neutral-500">Ningún anuncio activo</p>
                        </div>
                    ) : (
                        broadcasts.map(b => (
                            <div key={b.id} className="bg-white/5 border border-white/10 rounded-xl p-3 group relative overflow-hidden">
                                <div className="space-y-1.5 min-w-0 pr-6">
                                    <div className="flex items-center gap-1.5">
                                        <div className={cn("px-1.5 py-0.5 rounded text-[8px] font-bold flex items-center gap-1 border", getSeverityStyles(b.severity))}>
                                            {getSeverityIcon(b.severity)}
                                            {b.severity}
                                        </div>
                                        <h4 className="font-bold text-white text-xs truncate leading-tight">{b.title}</h4>
                                    </div>
                                    <p className="text-[10px] text-neutral-400 line-clamp-2 leading-relaxed">{b.content}</p>
                                    <div className="flex items-center gap-2 mt-2 text-[9px] text-neutral-500 flex-wrap">
                                        <div className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded">
                                            <Calendar className="w-2.5 h-2.5" />
                                            Exp: {new Date(b.expires_at).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                                        </div>
                                        <div className="bg-white/5 px-1.5 py-0.5 rounded">
                                            {new Date(b.created_at).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(b.id)}
                                    className="absolute top-2 right-2 p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all opacity-0 group-hover:opacity-100 bg-black/40 backdrop-blur-sm shadow-sm"
                                    title="Eliminar anuncio"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
