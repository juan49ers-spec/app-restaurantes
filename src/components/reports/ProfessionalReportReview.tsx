'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  History,
  Save,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { saveProfessionalReportDraft } from '@/app/actions/professional-reporting'
import { publishReportDraft, unpublishReportDraft } from '@/app/actions/portal'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn, formatCurrency, formatPct } from '@/lib/utils'
import { buildProfessionalReportPresentation, evaluateProfessionalReportQualityGate } from '@/lib/reporting'
import type {
  SavedProfessionalReportDraft,
} from '@/app/actions/professional-reporting'
import type {
  DataQualityStatus,
  PresentationKpi,
  ProfessionalReportQualityGate,
  ProfessionalReportSection,
  ProfessionalRestaurantReport,
  ReportMetric,
  ReportSectionId,
} from '@/lib/reporting'

interface ProfessionalReportReviewProps {
  initialPeriod: {
    from: string
    to: string
  }
  report: ProfessionalRestaurantReport | null
  error: string | null
  savedDrafts: SavedProfessionalReportDraft[]
}

type DraftNarratives = Record<string, string>
type SaveState = { type: 'success' | 'error'; message: string } | null
type DraftSaveStatus = SavedProfessionalReportDraft['status']

const SECTION_ORDER: ReportSectionId[] = [
  'sales',
  'costs',
  'staff',
  'suppliers',
  'menu_performance',
  'menu_engineering',
  'profitability',
  'recommendations',
  'data_appendix',
]

const STATUS_COPY: Record<DataQualityStatus, { label: string; className: string; bar: string }> = {
  OK: {
    label: 'Completo',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    bar: 'bg-emerald-500',
  },
  PARTIAL: {
    label: 'Parcial',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    bar: 'bg-amber-500',
  },
  MISSING: {
    label: 'Faltan datos',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
    bar: 'bg-rose-500',
  },
  CONFLICT: {
    label: 'Conflicto',
    className: 'border-red-200 bg-red-50 text-red-700',
    bar: 'bg-red-600',
  },
}

const DRAFT_STATUS_COPY: Record<SavedProfessionalReportDraft['status'], string> = {
  DRAFT: 'Borrador',
  REVIEWED: 'Revisado',
  READY: 'Listo',
}

const MAX_GATE_ITEMS_VISIBLE = 4

const QUALITY_GATE_COPY: Record<ProfessionalReportQualityGate['status'], { label: string; className: string }> = {
  READY: {
    label: 'Listo',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  WARNING: {
    label: 'Con advertencias',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  BLOCKED: {
    label: 'Bloqueado',
    className: 'border-red-200 bg-red-50 text-red-700',
  },
}

function formatMetricValue(metric: ReportMetric) {
  if (metric.value === null || metric.kind === 'not_available') return 'Sin dato'
  if (typeof metric.value === 'string') return metric.value
  if (metric.unit === 'eur') return formatCurrency(metric.value)
  if (metric.unit === 'pct') return formatPct(metric.value)
  if (metric.unit === 'days') return `${metric.value} dias`
  return new Intl.NumberFormat('es-ES').format(metric.value)
}

function formatKpiValue(kpi: PresentationKpi) {
  if (kpi.value === null) return 'Sin dato'
  if (typeof kpi.value === 'string') return kpi.value
  if (kpi.unit === 'eur') return formatCurrency(kpi.value)
  if (kpi.unit === 'pct') return formatPct(kpi.value)
  if (kpi.unit === 'days') return `${kpi.value} dias`
  return new Intl.NumberFormat('es-ES').format(kpi.value)
}

function issueTone(status: DataQualityStatus) {
  if (status === 'CONFLICT' || status === 'MISSING') return 'text-rose-700 bg-rose-50 border-rose-100'
  return 'text-amber-700 bg-amber-50 border-amber-100'
}

function buildDraftNarratives(report: ProfessionalRestaurantReport | null): DraftNarratives {
  if (!report) return {}

  return Object.fromEntries(
    report.sections.map(section => [
      section.id,
      section.narrative.join('\n\n'),
    ])
  )
}

function findSection(report: ProfessionalRestaurantReport, id: ReportSectionId) {
  return report.sections.find(section => section.id === id)
}

function SectionQualityBadge({ status }: { status: DataQualityStatus }) {
  const copy = STATUS_COPY[status]
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', copy.className)}>
      {copy.label}
    </span>
  )
}

function MetricGrid({ metrics }: { metrics: ReportMetric[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {metrics.map(metric => (
        <div key={metric.id} className="min-h-[96px] rounded-md border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium text-slate-500">{metric.label}</p>
            <Badge variant={metric.kind === 'actual' ? 'outline' : 'secondary'} className="rounded-md">
              {metric.kind}
            </Badge>
          </div>
          <p className="mt-3 text-xl font-semibold text-slate-950">{formatMetricValue(metric)}</p>
          <p className="mt-2 truncate text-[11px] text-slate-400">{metric.sourceIds.join(', ') || 'Fuente interna'}</p>
        </div>
      ))}
    </div>
  )
}

function QualityGatePanel({ gate }: { gate: ProfessionalReportQualityGate }) {
  const copy = QUALITY_GATE_COPY[gate.status]
  const items = [...gate.blockers, ...gate.warnings].slice(0, MAX_GATE_ITEMS_VISIBLE)

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              {gate.canPublish ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> : <TriangleAlert className="h-5 w-5 text-red-600" />}
              <h2 className="text-lg font-semibold text-slate-950">Quality gate de publicación</h2>
            </div>
            <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', copy.className)}>
              {copy.label}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{gate.summary}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-lg font-semibold text-slate-950">{gate.blockers.length}</p>
            <p className="text-[11px] font-medium uppercase text-slate-500">Bloqueos</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-lg font-semibold text-slate-950">{gate.warnings.length}</p>
            <p className="text-[11px] font-medium uppercase text-slate-500">Avisos</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-lg font-semibold text-slate-950">{gate.info.length}</p>
            <p className="text-[11px] font-medium uppercase text-slate-500">Info</p>
          </div>
        </div>
      </div>

      {items.length > 0 && (
        <div className="mt-5 grid gap-2">
          {items.map(item => (
            <div
              key={item.id}
              className={cn(
                'rounded-md border px-3 py-2 text-sm',
                item.severity === 'blocker'
                  ? 'border-red-100 bg-red-50 text-red-700'
                  : 'border-amber-100 bg-amber-50 text-amber-700'
              )}
            >
              <div className="flex items-start gap-2">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 leading-5">{item.message}</p>
                  {item.sourceIds.length > 0 && (
                    <p className="mt-1 text-xs opacity-80">{item.sourceIds.join(', ')}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function SectionPanel({
  section,
  draftValue,
  onDraftChange,
}: {
  section: ProfessionalReportSection
  draftValue: string
  onDraftChange: (value: string) => void
}) {
  const statusCopy = STATUS_COPY[section.quality.status]

  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50/70 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-950">{section.title}</h2>
            <SectionQualityBadge status={section.quality.status} />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Progress value={section.quality.confidence} indicatorClassName={statusCopy.bar} className="h-2 w-44 bg-slate-200" />
            <span className="text-xs font-medium text-slate-500">{section.quality.confidence}% confianza</span>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          {section.quality.evidence.length} evidencias · {section.quality.issues.length} incidencias
        </div>
      </div>

      {section.quality.issues.length > 0 && (
        <div className="mt-5 grid gap-2">
          {section.quality.issues.map(issue => (
            <div key={issue.id} className={cn('rounded-md border px-3 py-2 text-sm', issueTone(issue.status))}>
              <div className="flex items-start gap-2">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">{issue.message}</p>
                  <p className="mt-1 text-xs opacity-80">{issue.sourceIds.join(', ')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5">
        <MetricGrid metrics={section.metrics} />
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500" htmlFor={`draft-${section.id}`}>
            Narrativa revisable
          </label>
          <Textarea
            id={`draft-${section.id}`}
            value={draftValue}
            onChange={event => onDraftChange(event.target.value)}
            className="mt-2 min-h-32 resize-y bg-white text-sm leading-6"
          />
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Evidencia</p>
          <div className="mt-3 space-y-3">
            {section.quality.evidence.length === 0 ? (
              <p className="text-sm text-slate-500">Sin evidencia directa para esta sección.</p>
            ) : (
              section.quality.evidence.map(item => (
                <div key={`${item.sourceId}-${item.tables.join('.')}`} className="border-l-2 border-slate-200 pl-3">
                  <p className="text-sm font-medium text-slate-800">{item.sourceId}</p>
                  <p className="text-xs text-slate-500">{item.rowCount} filas · {item.tables.join(', ')}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export function ProfessionalReportReview({ initialPeriod, report, error, savedDrafts: initialSavedDrafts }: ProfessionalReportReviewProps) {
  const router = useRouter()
  const [from, setFrom] = useState(initialPeriod.from)
  const [to, setTo] = useState(initialPeriod.to)
  const [isPending, startTransition] = useTransition()
  const [draftNarratives, setDraftNarratives] = useState<DraftNarratives>(() => buildDraftNarratives(report))
  const [savedDrafts, setSavedDrafts] = useState(initialSavedDrafts)
  const [isSaving, setIsSaving] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>(null)

  useEffect(() => {
    setDraftNarratives(buildDraftNarratives(report))
  }, [report])

  useEffect(() => {
    setSavedDrafts(initialSavedDrafts)
  }, [initialSavedDrafts])

  const orderedSections = useMemo(() => {
    if (!report) return []
    return SECTION_ORDER
      .map(id => findSection(report, id))
      .filter((section): section is ProfessionalReportSection => Boolean(section))
  }, [report])
  const presentation = useMemo(() => report ? buildProfessionalReportPresentation(report) : null, [report])
  const qualityGate = useMemo(() => report ? evaluateProfessionalReportQualityGate(report) : null, [report])

  const readySections = report?.sections.filter(section => section.quality.status === 'OK').length ?? 0
  const totalSections = report?.sections.length ?? 0
  const criticalIssues = qualityGate?.blockers.length ?? 0

  function applyPeriod() {
    startTransition(() => {
      router.push(`/reports?from=${from}&to=${to}`)
    })
  }

  async function saveDraft(requestedStatus?: DraftSaveStatus) {
    if (!report || isSaving) return

    setIsSaving(true)
    setSaveState(null)

    const status: DraftSaveStatus = requestedStatus ?? (qualityGate?.canPublish ? 'REVIEWED' : 'DRAFT')
    const response = await saveProfessionalReportDraft({
      period: {
        from: report.period.from,
        to: report.period.to,
      },
      narrativeOverrides: draftNarratives,
      status,
    })

    if (response.success && response.data) {
      setSavedDrafts(current => [response.data!, ...current.filter(draft => draft.id !== response.data!.id)])
      setSaveState({ type: 'success', message: `Version ${response.data.version} guardada como ${DRAFT_STATUS_COPY[response.data.status].toLowerCase()}.` })
    } else {
      setSaveState({ type: 'error', message: response.error || 'No se pudo guardar la version.' })
    }

    setIsSaving(false)
  }

  async function togglePublishedDraft(draft: SavedProfessionalReportDraft) {
    const response = draft.publishedAt
      ? await unpublishReportDraft(draft.id)
      : await publishReportDraft(draft.id)

    if (!response.success) {
      setSaveState({ type: 'error', message: response.error || 'No se pudo actualizar la publicación.' })
      return
    }

    const publishedAt = draft.publishedAt ? null : new Date().toISOString()
    setSavedDrafts(current => current.map(item => item.id === draft.id
      ? { ...item, publishedAt }
      : item
    ))
    setSaveState({
      type: 'success',
      message: publishedAt ? 'Informe publicado en portal.' : 'Informe despublicado del portal.',
    })
  }

  return (
    <div className="min-h-screen bg-slate-100/60 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Informes profesionales</p>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Mesa de revision</h1>
                </div>
              </div>
              {report && (
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                  {report.restaurant.name} · {report.period.from} a {report.period.to}
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-[160px_160px_auto]">
              <div>
                <label className="text-xs font-medium text-slate-500" htmlFor="report-from">Desde</label>
                <Input id="report-from" type="date" value={from} onChange={event => setFrom(event.target.value)} className="mt-1 bg-white" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500" htmlFor="report-to">Hasta</label>
                <Input id="report-to" type="date" value={to} onChange={event => setTo(event.target.value)} className="mt-1 bg-white" />
              </div>
              <Button onClick={applyPeriod} disabled={isPending} className="self-end">
                <CalendarDays className="h-4 w-4" />
                {isPending ? 'Generando' : 'Generar'}
              </Button>
            </div>
          </div>
        </header>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No se pudo generar el informe</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {report && (
          <>
            <section className="grid gap-4 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">Estado global</p>
                  <SectionQualityBadge status={report.quality.status} />
                </div>
                <p className="mt-4 text-3xl font-semibold text-slate-950">{report.quality.confidence}%</p>
                <Progress value={report.quality.confidence} indicatorClassName={STATUS_COPY[report.quality.status].bar} className="mt-4 bg-slate-200" />
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2 text-slate-500">
                  <ShieldCheck className="h-4 w-4" />
                  <p className="text-sm font-medium">Secciones completas</p>
                </div>
                <p className="mt-4 text-3xl font-semibold text-slate-950">{readySections}/{totalSections}</p>
                <p className="mt-2 text-sm text-slate-500">Bloques listos para revision final.</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2 text-slate-500">
                  <TriangleAlert className="h-4 w-4" />
                  <p className="text-sm font-medium">Bloqueos críticos</p>
                </div>
                <p className="mt-4 text-3xl font-semibold text-slate-950">{criticalIssues}</p>
                <p className="mt-2 text-sm text-slate-500">Incidencias que impiden una conclusion firme.</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2 text-slate-500">
                  <BarChart3 className="h-4 w-4" />
                  <p className="text-sm font-medium">Fuentes declaradas</p>
                </div>
                <p className="mt-4 text-3xl font-semibold text-slate-950">{report.sourceMap.length}</p>
                <p className="mt-2 text-sm text-slate-500">Cada metrica conserva su trazabilidad.</p>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {criticalIssues === 0 ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <TriangleAlert className="h-5 w-5 text-amber-600" />}
                    <h2 className="text-lg font-semibold text-slate-950">{report.executiveSummary.headline}</h2>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {report.executiveSummary.keyFindings.map((finding, index) => (
                      <p key={`${finding}-${index}`} className="rounded-md bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
                        {finding}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="w-full rounded-md border border-slate-200 bg-slate-50 p-4 lg:w-80">
                  <p className="text-xs font-semibold uppercase text-slate-500">Contrato de salida</p>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Schema</dt>
                      <dd className="font-medium text-slate-800">{report.schemaVersion}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Generado</dt>
                      <dd className="font-medium text-slate-800">{new Date(report.generatedAt).toLocaleDateString('es-ES')}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Periodo</dt>
                      <dd className="font-medium text-slate-800">{report.period.days} dias</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </section>

            {qualityGate && <QualityGatePanel gate={qualityGate} />}

            {presentation && (
              <section className="rounded-lg border border-slate-200 bg-white p-6">
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vista de informe final</p>
                  <h2 className="text-xl font-semibold text-slate-950">{presentation.subtitle}</h2>
                  <p className="text-sm text-slate-600">KPIs y conclusiones que apareceran en la exportacion guardada.</p>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {presentation.kpis.map(kpi => (
                    <div key={kpi.id} className="min-h-[112px] rounded-md border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase text-slate-500">{kpi.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{formatKpiValue(kpi)}</p>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{kpi.note}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {presentation.conclusions.slice(0, 4).map(conclusion => (
                    <div key={conclusion.id} className="rounded-md border border-slate-200 bg-white p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-950 text-sm font-semibold text-white">
                          {conclusion.order}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{conclusion.title}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{conclusion.body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Save className="h-5 w-5 text-slate-700" />
                      <h2 className="text-lg font-semibold text-slate-950">Version guardada</h2>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      El guardado regenera los datos en servidor y conserva tus textos revisados para exportacion.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button onClick={() => saveDraft()} disabled={isSaving} variant="outline">
                      <Save className="h-4 w-4" />
                      {isSaving ? 'Guardando' : 'Guardar revision'}
                    </Button>
                    <Button onClick={() => saveDraft('READY')} disabled={isSaving || !qualityGate?.canPublish}>
                      <CheckCircle2 className="h-4 w-4" />
                      Guardar listo para publicar
                    </Button>
                  </div>
                </div>

                {saveState && (
                  <Alert variant={saveState.type === 'error' ? 'destructive' : 'default'} className="mt-5">
                    {saveState.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    <AlertTitle>{saveState.type === 'error' ? 'Guardado no completado' : 'Guardado completado'}</AlertTitle>
                    <AlertDescription>{saveState.message}</AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-slate-700" />
                  <h2 className="text-lg font-semibold text-slate-950">Versiones</h2>
                </div>

                <div className="mt-4 space-y-3">
                  {savedDrafts.length === 0 ? (
                    <p className="rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-500">
                      Aun no hay versiones guardadas para este periodo.
                    </p>
                  ) : (
                    savedDrafts.map(draft => (
                      <div key={draft.id} className="rounded-md border border-slate-200 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">Version {draft.version}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {draft.periodFrom} a {draft.periodTo}
                            </p>
                          </div>
                          <Badge variant="secondary" className="rounded-md">
                            {DRAFT_STATUS_COPY[draft.status]}
                          </Badge>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className="text-xs text-slate-500">
                            {new Date(draft.updatedAt).toLocaleString('es-ES')}
                          </p>
                          <div className="flex flex-wrap justify-end gap-2">
                            {draft.status === 'READY' && (
                              <Button size="sm" variant={draft.publishedAt ? 'secondary' : 'outline'} onClick={() => togglePublishedDraft(draft)}>
                                {draft.publishedAt ? 'Despublicar' : 'Publicar en portal'}
                              </Button>
                            )}
                            <Button asChild size="sm" variant="outline">
                              <a href={`/reports/print/${draft.id}`} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-4 w-4" />
                                Exportar
                              </a>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            <Tabs defaultValue={orderedSections[0]?.id} className="space-y-4">
              <TabsList className="h-auto flex-wrap justify-start rounded-lg bg-white p-2 shadow-sm">
                {orderedSections.map(section => (
                  <TabsTrigger key={section.id} value={section.id} className="gap-2 rounded-md">
                    <span>{section.title}</span>
                    <span className={cn('h-2 w-2 rounded-full', STATUS_COPY[section.quality.status].bar)} />
                  </TabsTrigger>
                ))}
              </TabsList>

              {orderedSections.map(section => (
                <TabsContent key={section.id} value={section.id}>
                  <SectionPanel
                    section={section}
                    draftValue={draftNarratives[section.id] ?? ''}
                    onDraftChange={value => setDraftNarratives(current => ({ ...current, [section.id]: value }))}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </>
        )}
      </div>
    </div>
  )
}
