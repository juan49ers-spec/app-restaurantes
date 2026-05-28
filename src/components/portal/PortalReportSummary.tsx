import Link from 'next/link'
import { CheckCircle2, Clock3, Eye, Sparkles } from 'lucide-react'
import type { PublishedReportSummary } from '@/app/actions/portal'
import { formatPortalDate } from '@/components/portal/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function deliveryState(report: PublishedReportSummary) {
  if (report.meetingStatus === 'COMPLETED') {
    return {
      label: 'Revisado',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      icon: CheckCircle2,
    }
  }
  if (report.meetingStatus === 'ACKNOWLEDGED') {
    return {
      label: 'Reunión en preparación',
      className: 'border-sky-200 bg-sky-50 text-sky-800',
      icon: Clock3,
    }
  }
  if (report.meetingStatus === 'PENDING') {
    return {
      label: 'Reunión solicitada',
      className: 'border-amber-200 bg-amber-50 text-amber-800',
      icon: Clock3,
    }
  }
  if (!report.viewedAt) {
    return {
      label: 'Nuevo',
      className: 'border-blue-200 bg-blue-50 text-blue-800',
      icon: Sparkles,
    }
  }
  return {
    label: 'Leído',
    className: 'border-slate-200 bg-slate-50 text-slate-700',
    icon: Eye,
  }
}

export function PortalReportSummary({ report }: { report: PublishedReportSummary }) {
  const state = deliveryState(report)
  const StateIcon = state.icon

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            {formatPortalDate(report.periodFrom)} a {formatPortalDate(report.periodTo)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Versión {report.version} · Publicado {new Date(report.publishedAt).toLocaleDateString('es-ES')}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {report.viewedAt
              ? `Visto ${new Date(report.viewedAt).toLocaleDateString('es-ES')}`
              : 'Pendiente de lectura'}
          </p>
        </div>
        <Badge variant="outline" className={cn('w-fit rounded-md gap-1.5', state.className)}>
          <StateIcon className="h-3.5 w-3.5" />
          {state.label}
        </Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={`/portal/reports/${report.id}`}>Ver informe</Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/reports/print/${report.id}`} target="_blank" rel="noreferrer">PDF</Link>
        </Button>
      </div>
    </div>
  )
}
