"use client"

import { useState, useEffect } from "react"
import { useCompletion } from "@ai-sdk/react"
import { m, AnimatePresence } from "framer-motion"
import { Sparkles, Save, FileDown, Edit3, MessageSquare, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { jsPDF } from "jspdf"
import { saveContextNotes, saveAiDraft, getPeriodReport } from "@/app/actions/ai-insights"

interface AiInsightsPanelProps {
    restaurantId: string
    moduleName: string
    periodKey: string
    metricsData: Record<string, unknown>
}

export function AiInsightsPanel({ restaurantId, moduleName, periodKey, metricsData }: AiInsightsPanelProps) {
    const [contextNotes, setContextNotes] = useState("")
    const [draftText, setDraftText] = useState("")
    const [isEditingDraft, setIsEditingDraft] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [savedState, setSavedState] = useState<'idle' | 'saved'>('idle')
    const [isLoaded, setIsLoaded] = useState(false)

    // Cargar datos previos si existen
    useEffect(() => {
        async function load() {
            const report = await getPeriodReport(restaurantId, moduleName, periodKey)
            if (report) {
                if (report.context_notes) setContextNotes(report.context_notes)
                if (report.ai_draft) setDraftText(report.ai_draft)
            }
            setIsLoaded(true)
        }
        load()
    }, [restaurantId, moduleName, periodKey])

    const { completion, complete, isLoading } = useCompletion({
        api: '/api/ai/generate-insights',
        onFinish: (_prompt: string, completionString: string) => {
            setDraftText(completionString)
            saveAiDraft(restaurantId, moduleName, periodKey, completionString)
        }
    })

    // Actualiza el texto en vivo mientras hace streaming
    const displayDraft = isLoading ? completion : draftText

    const handleSaveContext = async () => {
        setIsSaving(true)
        await saveContextNotes(restaurantId, moduleName, periodKey, contextNotes)
        setIsSaving(false)
        setSavedState('saved')
        setTimeout(() => setSavedState('idle'), 2000)
    }

    const handleGenerate = async () => {
        // Guardamos el contexto actual antes de enviar
        await saveContextNotes(restaurantId, moduleName, periodKey, contextNotes)
        
        // Ejecutamos AI
        complete('', {
            body: {
                restaurantId,
                moduleName,
                periodKey,
                contextNotes,
                metricsData
            }
        })
    }

    const handleSaveDraft = async () => {
        setIsSaving(true)
        await saveAiDraft(restaurantId, moduleName, periodKey, draftText)
        setIsEditingDraft(false)
        setIsSaving(false)
    }

    const exportToPDF = () => {
        const doc = new jsPDF()
        
        // Título
        doc.setFontSize(20)
        doc.setTextColor(20, 20, 20)
        doc.text(`Informe de IA - ${moduleName}`, 20, 20)
        
        doc.setFontSize(12)
        doc.setTextColor(100, 100, 100)
        doc.text(`Periodo: ${periodKey}`, 20, 30)

        // Línea separadora
        doc.setDrawColor(200, 200, 200)
        doc.line(20, 35, 190, 35)

        // Contenido
        doc.setFontSize(11)
        doc.setTextColor(40, 40, 40)
        
        // Procesar saltos de línea y formateo básico
        const lines = doc.splitTextToSize(displayDraft.replace(/\*\*/g, ""), 170)
        doc.text(lines, 20, 45)

        doc.save(`Informe_${moduleName}_${periodKey}.pdf`)
    }

    if (!isLoaded) return <div className="h-40 animate-pulse bg-neutral-100 rounded-3xl" />

    return (
        <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden group">
            {/* Efecto de brillo sutil en el fondo */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-primary/20 rounded-full blur-[80px] pointer-events-none group-hover:bg-primary/30 transition-colors duration-1000" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Panel Izquierdo: Contexto */}
                <div className="lg:col-span-4 flex flex-col h-full space-y-4">
                    <div>
                        <h3 className="text-xl font-serif font-bold text-white tracking-tight flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-neutral-400" />
                            Contexto Gerencial
                        </h3>
                        <p className="text-sm text-neutral-400 mt-1">Añade indicaciones para que la IA las considere en su análisis (ej. días festivos, clima, promociones).</p>
                    </div>

                    <Textarea 
                        value={contextNotes}
                        onChange={(e) => setContextNotes(e.target.value)}
                        placeholder="Ej: El martes 12 fue festivo local, por lo que la facturación al mediodía fue inusualmente alta..."
                        className="flex-1 min-h-[120px] bg-white/5 border-white/10 text-white placeholder:text-neutral-500 focus-visible:ring-primary/50 resize-none"
                    />

                    <div className="flex gap-2 mt-auto pt-2">
                        <Button 
                            variant="outline" 
                            className="bg-transparent border-white/20 text-white hover:bg-white/10 flex-1 transition-all"
                            onClick={handleSaveContext}
                            disabled={isSaving}
                        >
                            {savedState === 'saved' ? <Check className="w-4 h-4 mr-2 text-emerald-400" /> : <Save className="w-4 h-4 mr-2" />}
                            {savedState === 'saved' ? 'Guardado' : 'Guardar Contexto'}
                        </Button>
                        <Button 
                            className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                            onClick={handleGenerate}
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                            Generar AI
                        </Button>
                    </div>
                </div>

                {/* Separador Desktop */}
                <div className="hidden lg:block lg:col-span-1 relative">
                    <div className="absolute inset-y-0 left-1/2 w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                </div>

                {/* Panel Derecho: Borrador IA */}
                <div className="lg:col-span-7 flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-serif font-bold text-white tracking-tight flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                            Borrador de Conclusiones
                        </h3>
                        
                        {(displayDraft || isLoading) && (
                            <div className="flex gap-2">
                                {!isLoading && (
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-8 text-neutral-400 hover:text-white hover:bg-white/10"
                                        onClick={() => setIsEditingDraft(!isEditingDraft)}
                                    >
                                        <Edit3 className="w-4 h-4 mr-1.5" />
                                        {isEditingDraft ? 'Cancelar' : 'Editar'}
                                    </Button>
                                )}
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="h-8 bg-white/5 border-white/10 text-white hover:bg-white/15"
                                    onClick={exportToPDF}
                                    disabled={isLoading || !displayDraft}
                                >
                                    <FileDown className="w-4 h-4 mr-1.5" />
                                    PDF
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-h-[200px] bg-black/20 rounded-2xl border border-white/5 p-4 sm:p-5 relative group overflow-hidden">
                        {isLoading && (
                            <div className="absolute top-2 right-4 flex items-center gap-2 text-xs font-bold text-primary animate-pulse">
                                Analizando datos <Loader2 className="w-3 h-3 animate-spin" />
                            </div>
                        )}

                        {!displayDraft && !isLoading && (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                                <Sparkles className="w-8 h-8 mb-3" />
                                <p className="text-sm font-medium">No hay borrador generado.</p>
                                <p className="text-xs mt-1">Añade contexto y haz clic en Generar para que la IA interprete los datos.</p>
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            {isEditingDraft ? (
                                <m.div
                                    key="editing"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="h-full flex flex-col"
                                >
                                    <Textarea 
                                        value={draftText}
                                        onChange={(e) => setDraftText(e.target.value)}
                                        className="flex-1 bg-transparent border-none text-neutral-200 focus-visible:ring-0 p-0 text-sm leading-relaxed resize-none h-full focus-visible:ring-offset-0"
                                    />
                                    <div className="flex justify-end mt-2">
                                        <Button size="sm" onClick={handleSaveDraft} disabled={isSaving}>
                                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                            Guardar Cambios
                                        </Button>
                                    </div>
                                </m.div>
                            ) : (
                                displayDraft && (
                                    <m.div
                                        key="reading"
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="prose prose-sm prose-invert max-w-none text-neutral-300 h-[220px] overflow-y-auto custom-scrollbar pr-2"
                                    >
                                        <div className="whitespace-pre-wrap text-[13px] sm:text-sm leading-relaxed">
                                            {displayDraft}
                                        </div>
                                    </m.div>
                                )
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    )
}
