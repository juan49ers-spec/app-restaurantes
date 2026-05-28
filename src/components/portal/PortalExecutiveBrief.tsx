import Link from 'next/link'
import { ArrowRight, CalendarDays, Download, FileText, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPortalKpiValue } from '@/components/portal/format'
import type { ProfessionalReportPresentation } from '@/lib/reporting'
import { cn } from '@/lib/utils'

type PortalExecutiveBriefMode = 'home' | 'detail'

interface PortalExecutiveBriefProps {
  presentation: ProfessionalReportPresentation
  reportId: string
  version: number
  status: string
  mode: PortalExecutiveBriefMode
  restaurantName?: string
}

const TONE_CLASS: Record<string, string> = {
  positive: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  critical: 'border-rose-200 bg-rose-50 text-rose-800',
}

function primaryConclusion(presentation: ProfessionalReportPresentation) {
  return (
    presentation.conclusions.find(conclusion => conclusion.tone === 'critical') ??
    presentation.conclusions.find(conclusion => conclusion.tone === 'warning') ??
    presentation.conclusions[0] ??
    null
  )
}

export function PortalExecutiveBrief({
  presentation,
  reportId,
  version,
  status,
  mode,
  restaurantName,
}: PortalExecutiveBriefProps) {
  const mainConclusion = primaryConclusion(presentation)
  const visibleKpis = presentation.kpis.slice(0, 3)
  const priorityConclusions = presentation.conclusions.slice(0, 3)

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md shadow-slate-200/60">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-md border-emerald-200 bg-emerald-50 text-emerald-800">
              Informe publicado
            </Badge>
            <Badge variant="secondary" className="rounded-md">
              Versión {version}
            </Badge>
            <Badge variant="secondary" className="rounded-md">
              {status}
            </Badge>
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {presentation.eyebrow}
          </p>
          {restaurantName && (
            <p className="mt-3 text-sm font-bold uppercase tracking-wide text-slate-700">{restaurantName}</p>
          )}
          <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            {presentation.title}
          </h1>
          <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800">
            <CalendarDays className="h-4 w-4 text-slate-500" />
            {presentation.periodLabel}
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">{presentation.subtitle}</p>

          {mainConclusion && (
            <div className={cn('mt-6 rounded-md border p-4', TONE_CLASS[mainConclusion.tone])}>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">Lectura principal</p>
              </div>
              <p className="mt-3 text-base font-semibold">{mainConclusion.title}</p>
              <p className="mt-2 text-sm leading-6">{mainConclusion.body}</p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {mode === 'home' ? (
              <Button asChild>
                <Link href={`/portal/reports/${reportId}`}>
                  Ver informe completo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/portal">Volver al portal</Link>
              </Button>
            )}
            <Button asChild variant={mode === 'home' ? 'outline' : 'default'}>
              <Link href={`/reports/print/${reportId}`} target="_blank" rel="noreferrer">
                <Download className="mr-2 h-4 w-4" />
                Descargar PDF
              </Link>
            </Button>
          </div>
        </div>

        <aside className="border-t border-slate-200 bg-slate-950 p-6 text-white lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2 text-slate-300">
            <FileText className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wide">Resumen ejecutivo</p>
          </div>

          <div className="mt-5 grid gap-3">
            {visibleKpis.map(kpi => (
              <div key={kpi.id} className="rounded-md border border-white/10 bg-white/5 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-300">{kpi.label}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{formatPortalKpiValue(kpi)}</p>
                <p className="mt-2 text-xs leading-5 text-slate-300">{kpi.note}</p>
              </div>
            ))}
          </div>

          {priorityConclusions.length > 0 && (
            <div className="mt-5 rounded-md border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Prioridades de revisión
              </p>
              <ol className="mt-3 space-y-2">
                {priorityConclusions.map(conclusion => (
                  <li key={conclusion.id} className="text-sm leading-6 text-slate-100">
                    <span className="font-semibold">{conclusion.order}. {conclusion.title}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
