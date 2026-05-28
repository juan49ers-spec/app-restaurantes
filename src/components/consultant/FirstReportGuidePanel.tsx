import Link from 'next/link'
import { CheckCircle2, CircleDashed, FileText, Rocket, ShieldCheck } from 'lucide-react'
import type {
  ConsultantFirstReportGuide,
  ConsultantFirstReportGuideStepStatus,
} from '@/lib/consultant'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FirstReportGuidePanelProps {
  guide: ConsultantFirstReportGuide
}

const STEP_STATUS_COPY: Record<ConsultantFirstReportGuideStepStatus, { label: string; className: string }> = {
  done: {
    label: 'Listo',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  current: {
    label: 'Paso actual',
    className: 'border-slate-900 bg-slate-900 text-white',
  },
  pending: {
    label: 'Pendiente',
    className: 'border-slate-200 bg-white text-slate-600',
  },
}

const STATUS_ICON = {
  RESOLVE_DATA: FileText,
  CREATE_READY: FileText,
  FIX_QUALITY_GATE: ShieldCheck,
  PUBLISH_READY: Rocket,
  CLIENT_DELIVERY_READY: CheckCircle2,
} satisfies Record<ConsultantFirstReportGuide['status'], typeof FileText>

function stepIcon(status: ConsultantFirstReportGuideStepStatus) {
  if (status === 'done') return CheckCircle2
  return CircleDashed
}

export function FirstReportGuidePanel({ guide }: FirstReportGuidePanelProps) {
  const StatusIcon = STATUS_ICON[guide.status]

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-950 text-white">
              <StatusIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Primer informe guiado</p>
              <h2 className="text-lg font-semibold text-slate-950">{guide.title}</h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">{guide.summary}</p>
        </div>

        <Button asChild>
          <Link href={guide.primaryAction.href}>{guide.primaryAction.label}</Link>
        </Button>
      </div>

      <ol aria-label="Progreso del primer informe" className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {guide.steps.map(step => {
          const Icon = stepIcon(step.status)
          const status = STEP_STATUS_COPY[step.status]

          return (
            <li
              key={step.id}
              className={cn(
                'rounded-md border p-4',
                step.status === 'current' ? 'border-slate-900 bg-slate-50' : 'border-slate-200',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      'h-4 w-4',
                      step.status === 'done'
                        ? 'text-emerald-600'
                        : step.status === 'current'
                          ? 'text-slate-900'
                          : 'text-slate-400',
                    )}
                  />
                  <h3 className="text-sm font-semibold text-slate-950">{step.label}</h3>
                </div>
                <Badge variant="outline" className={cn('rounded-md', status.className)}>
                  {status.label}
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
