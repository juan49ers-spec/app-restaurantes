"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useCompletion } from "@ai-sdk/react"
import { m, AnimatePresence } from "framer-motion"
import ReactMarkdown from "react-markdown"
import {
    Sparkles, Save, FileDown, Edit3, MessageSquare, Loader2, Check,
    Eye, EyeOff, Copy, RotateCcw, Wand2, ChevronDown, Clock,
    AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { jsPDF } from "jspdf"
import { cn } from "@/lib/utils"
import { saveContextNotes, saveAiDraft, getPeriodReport } from "@/app/actions/ai-insights"

interface AiInsightsPanelProps {
    restaurantId: string
    moduleName: string
    periodKey: string
    metricsData: Record<string, unknown>
}

const MODULE_ICONS: Record<string, string> = {
    'Facturación': '💰',
    'Gastos': '📊',
    'Impuestos': '🏛️',
    'Resultados': '📈',
}

const MODULE_COLORS: Record<string, { accent: string; glow: string; badge: string }> = {
    'Facturación': { accent: 'from-emerald-500/20 to-teal-500/10', glow: 'bg-emerald-500/15', badge: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' },
    'Gastos': { accent: 'from-orange-500/20 to-amber-500/10', glow: 'bg-orange-500/15', badge: 'bg-orange-500/10 text-orange-400 ring-orange-500/20' },
    'Impuestos': { accent: 'from-blue-500/20 to-indigo-500/10', glow: 'bg-blue-500/15', badge: 'bg-blue-500/10 text-blue-400 ring-blue-500/20' },
    'Resultados': { accent: 'from-violet-500/20 to-purple-500/10', glow: 'bg-violet-500/15', badge: 'bg-violet-500/10 text-violet-400 ring-violet-500/20' },
}

const TONE_OPTIONS = [
    { id: 'executive', label: 'Ejecutivo', desc: 'Directo y con KPIs' },
    { id: 'detailed', label: 'Detallado', desc: 'Análisis profundo' },
    { id: 'actionable', label: 'Accionable', desc: 'Foco en acciones' },
] as const

type ToneId = typeof TONE_OPTIONS[number]['id']

export function AiInsightsPanel({ restaurantId, moduleName, periodKey, metricsData }: AiInsightsPanelProps) {
    const [contextNotes, setContextNotes] = useState("")
    const [draftText, setDraftText] = useState("")
    const [isEditingDraft, setIsEditingDraft] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [savedState, setSavedState] = useState<'idle' | 'saved'>('idle')
    const [isLoaded, setIsLoaded] = useState(false)
    const [showPdfPreview, setShowPdfPreview] = useState(false)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [copiedState, setCopiedState] = useState(false)
    const [tone, setTone] = useState<ToneId>('executive')
    const [showToneMenu, setShowToneMenu] = useState(false)
    const [generatedAt, setGeneratedAt] = useState<string | null>(null)
    const [hasUnsavedContext, setHasUnsavedContext] = useState(false)
    const draftEndRef = useRef<HTMLDivElement>(null)
    const toneMenuRef = useRef<HTMLDivElement>(null)

    const colors = MODULE_COLORS[moduleName] || MODULE_COLORS['Facturación']
    const emoji = MODULE_ICONS[moduleName] || '📋'

    // Close tone menu on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (toneMenuRef.current && !toneMenuRef.current.contains(e.target as Node)) {
                setShowToneMenu(false)
            }
        }
        if (showToneMenu) document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [showToneMenu])

    // Load previous data
    useEffect(() => {
        async function load() {
            const report = await getPeriodReport(restaurantId, moduleName, periodKey)
            if (report) {
                if (report.context_notes) setContextNotes(report.context_notes)
                if (report.ai_draft) {
                    setDraftText(report.ai_draft)
                    setGeneratedAt('previo')
                }
            }
            setIsLoaded(true)
        }
        load()
    }, [restaurantId, moduleName, periodKey])

    const { completion, complete, isLoading } = useCompletion({
        api: '/api/ai/generate-insights',
        onFinish: (_prompt: string, completionString: string) => {
            setDraftText(completionString)
            setGeneratedAt(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }))
            saveAiDraft(restaurantId, moduleName, periodKey, completionString)
        }
    })

    const displayDraft = isLoading ? completion : draftText

    // Auto-scroll while streaming
    useEffect(() => {
        if (isLoading && draftEndRef.current) {
            draftEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
        }
    }, [completion, isLoading])

    // Auto-save context notes (debounced)
    useEffect(() => {
        if (!isLoaded || !hasUnsavedContext) return
        const timer = setTimeout(async () => {
            await saveContextNotes(restaurantId, moduleName, periodKey, contextNotes)
            setHasUnsavedContext(false)
            setSavedState('saved')
            setTimeout(() => setSavedState('idle'), 1500)
        }, 2000)
        return () => clearTimeout(timer)
    }, [contextNotes, hasUnsavedContext, isLoaded, restaurantId, moduleName, periodKey])

    const handleContextChange = (value: string) => {
        setContextNotes(value)
        setHasUnsavedContext(true)
        setSavedState('idle')
    }

    const handleGenerate = async () => {
        await saveContextNotes(restaurantId, moduleName, periodKey, contextNotes)
        setHasUnsavedContext(false)
        complete('', {
            body: {
                restaurantId,
                moduleName,
                periodKey,
                contextNotes,
                metricsData,
                tone,
            }
        })
    }

    const handleSaveDraft = async () => {
        setIsSaving(true)
        await saveAiDraft(restaurantId, moduleName, periodKey, draftText)
        setIsEditingDraft(false)
        setIsSaving(false)
    }

    const handleCopy = async () => {
        await navigator.clipboard.writeText(displayDraft)
        setCopiedState(true)
        setTimeout(() => setCopiedState(false), 2000)
    }

    const buildPdf = useCallback(() => {
        const doc = new jsPDF()
        const pageWidth = doc.internal.pageSize.getWidth()

        // Header bar
        doc.setFillColor(23, 23, 23)
        doc.rect(0, 0, pageWidth, 40, 'F')

        doc.setFontSize(18)
        doc.setTextColor(255, 255, 255)
        doc.text(`${moduleName} — Informe IA`, 20, 18)

        doc.setFontSize(11)
        doc.setTextColor(180, 180, 180)
        doc.text(`Periodo: ${periodKey}`, 20, 28)
        doc.text(`Generado: ${generatedAt || new Date().toLocaleDateString('es-ES')}`, 20, 35)

        // Content
        doc.setFontSize(11)
        doc.setTextColor(40, 40, 40)

        const cleanText = displayDraft
            .replace(/^#{1,3}\s+/gm, '') // Remove markdown headers
            .replace(/\*\*/g, '')         // Remove bold markers
            .replace(/\*/g, '')           // Remove italic markers
            .replace(/^- /gm, '• ')       // Convert dashes to bullets

        const lines = doc.splitTextToSize(cleanText, 170)
        let y = 50
        const pageHeight = doc.internal.pageSize.getHeight()
        for (const line of lines) {
            if (y > pageHeight - 20) {
                doc.addPage()
                y = 20
            }
            doc.text(line, 20, y)
            y += 6
        }

        // Footer
        const totalPages = doc.getNumberOfPages()
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i)
            doc.setFontSize(8)
            doc.setTextColor(160, 160, 160)
            doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
        }

        return doc
    }, [displayDraft, moduleName, periodKey, generatedAt])

    const exportToPDF = () => {
        buildPdf().save(`Informe_${moduleName}_${periodKey}.pdf`)
    }

    const pdfDataUrl = useMemo(() => {
        if (!showPdfPreview || !displayDraft) return null
        try {
            return buildPdf().output('datauristring')
        } catch {
            return null
        }
    }, [showPdfPreview, displayDraft, buildPdf])

    const wordCount = useMemo(() => {
        if (!displayDraft) return 0
        return displayDraft.trim().split(/\s+/).filter(Boolean).length
    }, [displayDraft])

    // Loading skeleton
    if (!isLoaded) {
        return (
            <div className="rounded-2xl overflow-hidden">
                <div className="h-14 bg-neutral-900 animate-pulse" />
                <div className="h-64 bg-neutral-900/80 animate-pulse" />
            </div>
        )
    }

    return (
        <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="rounded-2xl overflow-hidden shadow-2xl shadow-black/20"
        >
            {/* ─── Header ─── */}
            <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={cn(
                    "w-full flex items-center justify-between px-5 py-3.5 transition-colors",
                    "bg-gradient-to-r from-neutral-900 to-neutral-800 hover:from-neutral-800 hover:to-neutral-700",
                    "border-b border-white/5"
                )}
            >
                <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-sm", colors.glow)}>
                        {emoji}
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-bold text-white tracking-tight">
                            Análisis IA — {moduleName}
                        </h3>
                        <p className="text-[11px] text-neutral-500">{periodKey}</p>
                    </div>
                    {generatedAt && !isCollapsed && (
                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full ring-1 ml-2", colors.badge)}>
                            <Clock className="w-3 h-3 inline mr-0.5 -mt-px" />
                            {generatedAt}
                        </span>
                    )}
                </div>
                <m.div animate={{ rotate: isCollapsed ? 0 : 180 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-4 h-4 text-neutral-500" />
                </m.div>
            </button>

            {/* ─── Body ─── */}
            <AnimatePresence initial={false}>
                {!isCollapsed && (
                    <m.div
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="bg-neutral-900 relative">
                            {/* Ambient glow */}
                            <div className={cn("absolute top-0 right-0 w-80 h-80 rounded-full blur-[120px] -mr-40 -mt-40 pointer-events-none opacity-40 bg-gradient-to-br", colors.accent)} />

                            <div className="relative z-10 p-5 sm:p-6">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                                    {/* ─── Left: Context Notes ─── */}
                                    <div className="lg:col-span-4 flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                                                <MessageSquare className="w-3.5 h-3.5" />
                                                Notas de Contexto
                                            </label>
                                            <AnimatePresence mode="wait">
                                                {savedState === 'saved' && (
                                                    <m.span
                                                        key="saved"
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                        className="text-[10px] text-emerald-400 font-medium flex items-center gap-1"
                                                    >
                                                        <Check className="w-3 h-3" /> Guardado
                                                    </m.span>
                                                )}
                                                {hasUnsavedContext && savedState !== 'saved' && (
                                                    <m.span
                                                        key="unsaved"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        className="text-[10px] text-amber-400/70 font-medium flex items-center gap-1"
                                                    >
                                                        <AlertCircle className="w-3 h-3" /> Sin guardar
                                                    </m.span>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <Textarea
                                            value={contextNotes}
                                            onChange={(e) => handleContextChange(e.target.value)}
                                            placeholder="Ej: El martes 12 fue festivo local. Hicimos promoción 2x1 en delivery. El proveedor principal subió precios un 5%..."
                                            className={cn(
                                                "flex-1 min-h-[140px] text-[13px] leading-relaxed resize-none rounded-xl",
                                                "bg-white/[0.03] border-white/[0.06] text-neutral-200",
                                                "placeholder:text-neutral-600",
                                                "focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:border-white/10",
                                                "transition-colors"
                                            )}
                                        />

                                        {/* Tone selector + Generate */}
                                        <div className="flex items-stretch gap-2">
                                            <div ref={toneMenuRef} className="relative">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className={cn(
                                                        "h-9 px-3 text-xs font-medium gap-1.5",
                                                        "bg-white/[0.03] border-white/10 text-neutral-300",
                                                        "hover:bg-white/[0.06] hover:text-white"
                                                    )}
                                                    onClick={() => setShowToneMenu(!showToneMenu)}
                                                >
                                                    <Wand2 className="w-3.5 h-3.5" />
                                                    {TONE_OPTIONS.find(t => t.id === tone)?.label}
                                                    <ChevronDown className="w-3 h-3 ml-0.5 opacity-50" />
                                                </Button>
                                                <AnimatePresence>
                                                    {showToneMenu && (
                                                        <m.div
                                                            initial={{ opacity: 0, y: -4, scale: 0.95 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                                            className="absolute bottom-full left-0 mb-1.5 w-48 bg-neutral-800 border border-white/10 rounded-xl shadow-xl shadow-black/40 overflow-hidden z-20"
                                                        >
                                                            {TONE_OPTIONS.map(t => (
                                                                <button
                                                                    key={t.id}
                                                                    type="button"
                                                                    onClick={() => { setTone(t.id); setShowToneMenu(false) }}
                                                                    className={cn(
                                                                        "w-full text-left px-3.5 py-2.5 text-xs transition-colors",
                                                                        tone === t.id
                                                                            ? "bg-white/10 text-white"
                                                                            : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
                                                                    )}
                                                                >
                                                                    <span className="font-semibold block">{t.label}</span>
                                                                    <span className="text-[10px] opacity-60">{t.desc}</span>
                                                                </button>
                                                            ))}
                                                        </m.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            <Button
                                                className={cn(
                                                    "flex-1 h-9 text-xs font-bold gap-2 rounded-xl transition-all",
                                                    "bg-gradient-to-r from-amber-500 to-orange-500",
                                                    "hover:from-amber-400 hover:to-orange-400",
                                                    "text-neutral-900 shadow-lg shadow-amber-500/20",
                                                    isLoading && "animate-pulse"
                                                )}
                                                onClick={handleGenerate}
                                                disabled={isLoading}
                                            >
                                                {isLoading ? (
                                                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analizando...</>
                                                ) : draftText ? (
                                                    <><RotateCcw className="w-3.5 h-3.5" /> Regenerar</>
                                                ) : (
                                                    <><Sparkles className="w-3.5 h-3.5" /> Generar Análisis</>
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* ─── Divider ─── */}
                                    <div className="hidden lg:flex lg:col-span-1 justify-center">
                                        <div className="w-px bg-gradient-to-b from-transparent via-white/8 to-transparent" />
                                    </div>

                                    {/* ─── Right: AI Draft ─── */}
                                    <div className="lg:col-span-7 flex flex-col gap-3">
                                        {/* Toolbar */}
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                                Borrador
                                                {wordCount > 0 && (
                                                    <span className="text-neutral-600 font-normal ml-1">· {wordCount} palabras</span>
                                                )}
                                            </label>

                                            {(displayDraft || isLoading) && (
                                                <div className="flex items-center gap-1">
                                                    {!isLoading && (
                                                        <>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 px-2 text-[11px] text-neutral-500 hover:text-white hover:bg-white/5"
                                                                onClick={handleCopy}
                                                            >
                                                                {copiedState
                                                                    ? <><Check className="w-3 h-3 mr-1 text-emerald-400" /> Copiado</>
                                                                    : <><Copy className="w-3 h-3 mr-1" /> Copiar</>
                                                                }
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 px-2 text-[11px] text-neutral-500 hover:text-white hover:bg-white/5"
                                                                onClick={() => setIsEditingDraft(!isEditingDraft)}
                                                            >
                                                                <Edit3 className="w-3 h-3 mr-1" />
                                                                {isEditingDraft ? 'Ver' : 'Editar'}
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 px-2 text-[11px] text-neutral-500 hover:text-white hover:bg-white/5"
                                                                onClick={() => setShowPdfPreview(!showPdfPreview)}
                                                            >
                                                                {showPdfPreview ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                                                                PDF
                                                            </Button>
                                                        </>
                                                    )}
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        className={cn(
                                                            "h-7 px-2.5 text-[11px] font-semibold",
                                                            "bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white",
                                                            "border border-white/5"
                                                        )}
                                                        onClick={exportToPDF}
                                                        disabled={isLoading || !displayDraft}
                                                    >
                                                        <FileDown className="w-3 h-3 mr-1" /> Descargar
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Draft content area */}
                                        <div className={cn(
                                            "flex-1 min-h-[200px] rounded-xl border relative overflow-hidden",
                                            "bg-black/30 border-white/[0.04]",
                                            isLoading && "ring-1 ring-amber-500/20"
                                        )}>
                                            {/* Streaming indicator */}
                                            {isLoading && (
                                                <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden z-10">
                                                    <m.div
                                                        className="h-full bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500"
                                                        animate={{ x: ['-100%', '100%'] }}
                                                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                                        style={{ width: '50%' }}
                                                    />
                                                </div>
                                            )}

                                            {/* Empty state */}
                                            {!displayDraft && !isLoading && (
                                                <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center px-8">
                                                    <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-3">
                                                        <Sparkles className="w-5 h-5 text-neutral-600" />
                                                    </div>
                                                    <p className="text-sm text-neutral-500 font-medium">Sin borrador generado</p>
                                                    <p className="text-xs text-neutral-600 mt-1 max-w-[240px]">
                                                        Añade contexto opcional y pulsa <span className="text-amber-500/80 font-semibold">Generar Análisis</span> para obtener conclusiones de IA.
                                                    </p>
                                                </div>
                                            )}

                                            {/* Content */}
                                            <AnimatePresence mode="wait">
                                                {isEditingDraft && !isLoading ? (
                                                    <m.div
                                                        key="editing"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        className="h-full flex flex-col p-4"
                                                    >
                                                        <Textarea
                                                            value={draftText}
                                                            onChange={(e) => setDraftText(e.target.value)}
                                                            className={cn(
                                                                "flex-1 bg-transparent border-none text-neutral-200 text-sm leading-relaxed",
                                                                "resize-none h-[260px]",
                                                                "focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                                                            )}
                                                        />
                                                        <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-white/5">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 text-xs text-neutral-400 hover:text-white"
                                                                onClick={() => setIsEditingDraft(false)}
                                                            >
                                                                Cancelar
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                className="h-8 text-xs bg-white/10 hover:bg-white/15 text-white"
                                                                onClick={handleSaveDraft}
                                                                disabled={isSaving}
                                                            >
                                                                {isSaving ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Save className="w-3 h-3 mr-1.5" />}
                                                                Guardar
                                                            </Button>
                                                        </div>
                                                    </m.div>
                                                ) : displayDraft ? (
                                                    <m.div
                                                        key="reading"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        className="h-[280px] overflow-y-auto p-4 sm:p-5 custom-scrollbar"
                                                    >
                                                        <div className="prose prose-sm prose-invert max-w-none
                                                            prose-headings:text-white prose-headings:font-bold prose-headings:tracking-tight
                                                            prose-h1:text-base prose-h1:mb-3 prose-h1:mt-0
                                                            prose-h2:text-sm prose-h2:mb-2 prose-h2:mt-4
                                                            prose-h3:text-xs prose-h3:mb-2 prose-h3:mt-3 prose-h3:text-amber-400/90
                                                            prose-p:text-neutral-300 prose-p:text-[13px] prose-p:leading-relaxed prose-p:mb-2
                                                            prose-li:text-neutral-300 prose-li:text-[13px] prose-li:leading-relaxed
                                                            prose-strong:text-white prose-strong:font-semibold
                                                            prose-ul:my-1.5 prose-ol:my-1.5
                                                        ">
                                                            <ReactMarkdown>{displayDraft}</ReactMarkdown>
                                                        </div>
                                                        <div ref={draftEndRef} />
                                                    </m.div>
                                                ) : null}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>

                                {/* ─── Live PDF Preview ─── */}
                                <AnimatePresence>
                                    {showPdfPreview && pdfDataUrl && (
                                        <m.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="mt-5 overflow-hidden"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Eye className="w-3.5 h-3.5" /> Vista previa PDF
                                                </span>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 text-[11px] text-neutral-500 hover:text-white"
                                                    onClick={() => setShowPdfPreview(false)}
                                                >
                                                    <EyeOff className="w-3 h-3 mr-1" /> Cerrar
                                                </Button>
                                            </div>
                                            <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-white shadow-inner">
                                                <iframe
                                                    src={pdfDataUrl}
                                                    title={`Preview PDF - ${moduleName} ${periodKey}`}
                                                    className="w-full h-[480px]"
                                                />
                                            </div>
                                        </m.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </m.div>
                )}
            </AnimatePresence>
        </m.div>
    )
}
