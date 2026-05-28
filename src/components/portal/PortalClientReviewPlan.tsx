import Link from 'next/link'
import { CheckCircle2, CircleDashed, ClipboardCheck, MessageSquareText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type {
  PortalClientReviewPlan as PortalClientReviewPlanModel,
  PortalClientReviewPlanItemStatus,
} from '@/lib/portal-insights'
import { cn } from '@/lib/utils'

interface PortalClientReviewPlanProps {
  plan: PortalClientReviewPlanModel
}

const STATUS_COPY: Record<PortalClientReviewPlanItemStatus, { label: string; className: string }> = {
  done: {
    label: 'Listo',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  current: {
    label: 'Ahora',
    className: 'border-slate-900 bg-slate-900 text-white',
  },
  pending: {
    label: 'Después',
    className: 'border-slate-200 bg-white text-slate-600',
  },
}

function itemIcon(status: PortalClientReviewPlanItemStatus) {
  if (status === 'done') return CheckCircle2
  if (status === 'current') return ClipboardCheck
  return CircleDashed
}

export function PortalClientReviewPlan({ plan }: PortalClientReviewPlanProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-slate-500">
            <MessageSquareText className="h-4 w-4" />
            <p className="text-xs font-bold uppercase tracking-[0.18em]">Plan de revisión</p>
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">{plan.headline}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{plan.summary}</p>
        </div>

        <Button asChild>
          <Link href={plan.primaryAction.href}>{plan.primaryAction.label}</Link>
        </Button>
      </div>

      <ol aria-label="Pasos del plan de revisión" className="mt-5 grid gap-3 md:grid-cols-3">
        {plan.items.map(item => {
          const Icon = itemIcon(item.status)
          const status = STATUS_COPY[item.status]

          return (
            <li
              key={item.id}
              className={cn(
                'rounded-lg border p-4',
                item.status === 'current' ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      'h-4 w-4',
                      item.status === 'done'
                        ? 'text-emerald-600'
                        : item.status === 'current'
                          ? 'text-slate-950'
                          : 'text-slate-400',
                    )}
                  />
                  <h3 className="text-sm font-bold text-slate-950">{item.label}</h3>
                </div>
                <Badge variant="outline" className={cn('rounded-md', status.className)}>
                  {status.label}
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
