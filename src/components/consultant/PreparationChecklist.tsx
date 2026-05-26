import Link from 'next/link'
import { AlertCircle, CheckCircle2, CircleDashed } from 'lucide-react'
import type { ConsultantPreparationChecklist, ConsultantChecklistStatus } from '@/app/actions/consultant'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PreparationChecklistProps {
  checklist: ConsultantPreparationChecklist
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

export function PreparationChecklist({ checklist }: PreparationChecklistProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preparación del informe</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            Checklist {checklist.period.from} a {checklist.period.to}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Guía interna para saber si el periodo está preparado antes de guardar y publicar el informe profesional.
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-right">
          <p className="text-2xl font-semibold text-slate-950">{checklist.completionPct}%</p>
          <p className="text-xs text-slate-500">{checklist.readyCount}/{checklist.totalCount} puntos listos</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
