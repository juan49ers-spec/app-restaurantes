'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CheckCircle2, Clock3, ExternalLink, FileCheck2, Send } from 'lucide-react'
import type { ConsultantDeliveryReport, ConsultantDeliveryStatus } from '@/app/actions/consultant'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateEs } from '@/lib/date-format'
import { cn } from '@/lib/utils'

interface DeliveryWorkflowPanelProps {
  reports: ConsultantDeliveryReport[]
}

type DeliveryFilter = 'all' | 'open' | 'published' | 'closed'

const STATUS_COPY: Record<ConsultantDeliveryStatus, { label: string; className: string; icon: typeof FileCheck2 }> = {
  READY_TO_PUBLISH: {
    label: 'Listo para publicar',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: FileCheck2,
  },
  PUBLISHED: {
    label: 'Publicado',
    className: 'border-sky-200 bg-sky-50 text-sky-700',
    icon: Send,
  },
  MEETING_REQUESTED: {
    label: 'Reunión solicitada',
    className: 'border-violet-200 bg-violet-50 text-violet-700',
    icon: Clock3,
  },
  FOLLOW_UP_COMPLETE: {
    label: 'Seguimiento cerrado',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: CheckCircle2,
  },
}

const FILTER_COPY: Record<DeliveryFilter, string> = {
  all: 'Todos',
  open: 'Abiertos',
  published: 'Publicados',
  closed: 'Cerrados',
}

const TIMELINE_STEPS = [
  { id: 'ready', label: 'READY' },
  { id: 'published', label: 'Portal' },
  { id: 'requested', label: 'Reunión' },
  { id: 'closed', label: 'Cierre' },
] as const

function buildStatusDetail(report: ConsultantDeliveryReport) {
  if (report.status === 'READY_TO_PUBLISH') return 'El informe está marcado como READY y pendiente de publicación.'
  if (report.status === 'MEETING_REQUESTED') return `${report.openRequestCount} solicitudes abiertas del cliente.`
  if (report.status === 'FOLLOW_UP_COMPLETE') return `${report.completedRequestCount} solicitudes completadas tras la entrega.`
  if (report.viewedAt) return `Visto por el cliente el ${formatDateEs(report.viewedAt)}.`
  return report.publishedAt ? `Visible en portal desde ${formatDateEs(report.publishedAt)}. Pendiente de lectura del cliente.` : 'Visible en portal.'
}

function isStepComplete(report: ConsultantDeliveryReport, step: typeof TIMELINE_STEPS[number]['id']) {
  if (step === 'ready') return true
  if (step === 'published') return report.status !== 'READY_TO_PUBLISH'
  if (step === 'requested') return report.status === 'MEETING_REQUESTED' || report.status === 'FOLLOW_UP_COMPLETE'
  return report.status === 'FOLLOW_UP_COMPLETE'
}

function isStepActive(report: ConsultantDeliveryReport, step: typeof TIMELINE_STEPS[number]['id']) {
  if (report.status === 'READY_TO_PUBLISH') return step === 'ready'
  if (report.status === 'PUBLISHED') return step === 'published'
  if (report.status === 'MEETING_REQUESTED') return step === 'requested'
  return step === 'closed'
}

function matchesFilter(report: ConsultantDeliveryReport, filter: DeliveryFilter) {
  if (filter === 'all') return true
  if (filter === 'open') return report.status === 'READY_TO_PUBLISH' || report.status === 'MEETING_REQUESTED'
  if (filter === 'published') return report.status === 'PUBLISHED'
  return report.status === 'FOLLOW_UP_COMPLETE'
}

function filterCount(reports: ConsultantDeliveryReport[], filter: DeliveryFilter) {
  return reports.filter(report => matchesFilter(report, filter)).length
}

function DeliveryTimeline({ report }: { report: ConsultantDeliveryReport }) {
  return (
    <div className="mt-4 grid grid-cols-4 gap-2">
      {TIMELINE_STEPS.map((step, index) => {
        const complete = isStepComplete(report, step.id)
        const active = isStepActive(report, step.id)

        return (
          <div key={step.id} className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                  complete ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-400',
                  active && 'ring-2 ring-slate-300 ring-offset-2'
                )}
              >
                {index + 1}
              </span>
              <span className={cn('truncate text-xs font-medium', complete ? 'text-slate-800' : 'text-slate-400')}>
                {step.label}
              </span>
            </div>
            {index < TIMELINE_STEPS.length - 1 && (
              <span className={cn('hidden h-px flex-1 sm:block', complete ? 'bg-slate-300' : 'bg-slate-100')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function DeliveryWorkflowPanel({ reports }: DeliveryWorkflowPanelProps) {
  const [filter, setFilter] = useState<DeliveryFilter>('all')
  const visibleReports = useMemo(
    () => reports.filter(report => matchesFilter(report, filter)),
    [filter, reports]
  )
  const priorityCount = filterCount(reports, 'open')

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Flujo de entrega</p>
          <h2 className="text-lg font-semibold text-slate-950">Informes listos y seguimiento cliente</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Vista operativa del camino: guardar READY, publicar en portal, recibir solicitud y cerrar seguimiento.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Badge variant="secondary" className="w-fit rounded-md">
            {reports.length} entregas
          </Badge>
          {priorityCount > 0 && (
            <Badge variant="outline" className="w-fit rounded-md border-amber-200 bg-amber-50 text-amber-700">
              {priorityCount} requieren acción
            </Badge>
          )}
        </div>
      </div>

      {reports.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {(Object.keys(FILTER_COPY) as DeliveryFilter[]).map(item => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={filter === item ? 'default' : 'outline'}
              onClick={() => setFilter(item)}
            >
              {FILTER_COPY[item]} ({filterCount(reports, item)})
            </Button>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-3">
        {reports.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 p-5 text-sm text-slate-500">
            Aún no hay informes READY para iniciar una entrega al cliente.
          </div>
        ) : visibleReports.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 p-5 text-sm text-slate-500">
            No hay entregas en este filtro.
          </div>
        ) : (
          visibleReports.map(report => {
            const status = STATUS_COPY[report.status]
            const Icon = status.icon
            const needsAction = report.status === 'READY_TO_PUBLISH' || report.status === 'MEETING_REQUESTED'

            return (
              <article
                key={report.id}
                className={cn(
                  'rounded-md border p-4',
                  needsAction ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200'
                )}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Icon className="h-4 w-4 text-slate-500" />
                      <p className="font-medium text-slate-950">
                        {report.periodFrom} a {report.periodTo}
                      </p>
                      <Badge variant="outline" className={cn('rounded-md', status.className)}>
                        {status.label}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      Versión {report.version} · {buildStatusDetail(report)}
                    </p>
                    {report.publishedAt && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'mt-3 w-fit rounded-md',
                          report.viewedAt
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-white text-slate-600'
                        )}
                      >
                        {report.viewedAt ? 'Visto por el cliente' : 'Pendiente de lectura'}
                      </Badge>
                    )}
                    <DeliveryTimeline report={report} />
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {report.publishedAt && (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/reports/print/${report.id}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                          PDF
                        </Link>
                      </Button>
                    )}
                    <Button asChild size="sm" variant={report.status === 'READY_TO_PUBLISH' || report.status === 'MEETING_REQUESTED' ? 'default' : 'outline'}>
                      <Link href={report.nextActionHref}>{report.nextActionLabel}</Link>
                    </Button>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}
