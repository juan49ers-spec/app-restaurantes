'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, CircleDashed, ShieldCheck, TriangleAlert } from 'lucide-react'
import {
  getPreparationChecklistForPeriod,
  type ConsultantChecklistStatus,
  type ConsultantPreparationChecklist,
  type ConsultantPreparationQualityGate,
} from '@/app/actions/consultant'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DEFAULT_BUSINESS_TIME_ZONE } from '@/lib/date-format'
import { cn } from '@/lib/utils'

interface PreparationChecklistProps {
  initialChecklist: ConsultantPreparationChecklist
}

const STATUS_COPY: Record<ConsultantChecklistStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  complete: {
    label: 'Listo',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: CheckCircle2,
  },
  partial: {
    label: 'Revisar',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: CircleDashed,
  },
  missing: {
    label: 'Pendiente',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
    icon: AlertCircle,
  },
}

const QUALITY_GATE_COPY: Record<ConsultantPreparationQualityGate['status'], { label: string; className: string }> = {
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

function formatMonthLabel(from: string) {
  const date = new Date(`${from}T00:00:00.000Z`)
  const label = new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function currentMonth() {
  const parts = new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    timeZone: DEFAULT_BUSINESS_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(new Date())
  const year = parts.find(part => part.type === 'year')?.value
  const month = parts.find(part => part.type === 'month')?.value
  return year && month ? `${year}-${month}` : new Date().toISOString().slice(0, 7)
}

export function PreparationChecklist({ initialChecklist }: PreparationChecklistProps) {
  const [checklist, setChecklist] = useState(initialChecklist)
  const [isPending, startTransition] = useTransition()
  const isCurrentMonth = checklist.period.month >= currentMonth()

  function navigateMonth(delta: -1 | 1) {
    const [year, month] = checklist.period.month.split('-').map(Number)
    const target = new Date(Date.UTC(year, month - 1 + delta, 1))
    const targetMonth = target.toISOString().slice(0, 7)

    startTransition(async () => {
      const response = await getPreparationChecklistForPeriod({ month: targetMonth })
      if (response.success && response.data) {
        setChecklist(response.data)
      }
    })
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preparación del informe</p>
          <div className="mt-1 flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isPending}
              aria-label="Mes anterior"
              onClick={() => navigateMonth(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="min-w-44 text-center text-lg font-semibold text-slate-950">
              {formatMonthLabel(checklist.period.from)}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isPending || isCurrentMonth}
              aria-label="Mes siguiente"
              onClick={() => navigateMonth(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Guía interna para saber si el periodo está preparado antes de guardar y publicar el informe profesional.
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-right">
          <p className="text-2xl font-semibold text-slate-950">{checklist.completionPct}%</p>
          <p className="text-xs text-slate-500">{checklist.readyCount}/{checklist.totalCount} puntos listos</p>
        </div>
      </div>

      <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {checklist.qualityGate?.canPublish ? (
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              ) : (
                <TriangleAlert className="h-4 w-4 text-amber-600" />
              )}
              <h3 className="text-sm font-semibold text-slate-950">Quality gate del informe</h3>
              {checklist.qualityGate ? (
                <Badge variant="outline" className={cn('rounded-md', QUALITY_GATE_COPY[checklist.qualityGate.status].className)}>
                  {QUALITY_GATE_COPY[checklist.qualityGate.status].label}
                </Badge>
              ) : (
                <Badge variant="outline" className="rounded-md border-slate-200 bg-white text-slate-600">
                  Sin versión READY todavía
                </Badge>
              )}
            </div>
            {checklist.qualityGate ? (
              <>
                <p className="mt-2 text-sm leading-6 text-slate-600">{checklist.qualityGate.summary}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Versión READY {checklist.qualityGate.version}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Guarda una versión READY para que el sistema pueda validar si el snapshot es publicable.
              </p>
            )}
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            {checklist.qualityGate && (
              <p className="text-xs font-medium text-slate-500">
                {checklist.qualityGate.blockerCount} bloqueos · {checklist.qualityGate.warningCount} avisos · {checklist.qualityGate.infoCount} info
              </p>
            )}
            <Button asChild size="sm" variant={checklist.qualityGate?.canPublish ? 'outline' : 'default'}>
              <Link href={checklist.qualityGate?.href ?? `/reports?from=${checklist.period.from}&to=${checklist.period.to}`}>
                {checklist.qualityGate ? 'Revisar informe' : 'Crear READY'}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className={cn('mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3', isPending && 'opacity-60')}>
        {checklist.items.map(item => {
          const status = STATUS_COPY[item.status]
          const Icon = status.icon

          return (
            <article key={item.id} className="flex min-h-36 flex-col justify-between rounded-md border border-slate-200 p-4">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-4 w-4', item.status === 'complete' ? 'text-emerald-600' : item.status === 'partial' ? 'text-amber-600' : 'text-rose-600')} />
                    <h3 className="text-sm font-semibold text-slate-950">{item.label}</h3>
                  </div>
                  <Badge variant="outline" className={cn('rounded-md', status.className)}>{status.label}</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                <p className="mt-2 text-xs text-slate-500">Registros: {item.count}</p>
              </div>
              <div className="mt-4">
                <Button asChild size="sm" variant={item.status === 'missing' ? 'default' : 'outline'}>
                  <Link href={item.href}>{item.status === 'complete' ? 'Abrir' : 'Resolver'}</Link>
                </Button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
