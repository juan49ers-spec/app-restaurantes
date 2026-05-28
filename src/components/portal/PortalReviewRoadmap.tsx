import { CheckCircle2, Clock3, Eye, FileText, MessageSquareText } from 'lucide-react'
import type { PublishedReportSummary } from '@/lib/portal'

interface PortalReviewRoadmapProps {
  viewedAt: string | null
  meetingStatus: PublishedReportSummary['meetingStatus']
  suggestedActionCount: number
}

type RoadmapStepTone = 'complete' | 'active' | 'pending'

interface RoadmapStep {
  id: string
  label: string
  body: string
  tone: RoadmapStepTone
  icon: typeof FileText
}

function meetingStep(status: PublishedReportSummary['meetingStatus']): RoadmapStep {
  if (status === 'COMPLETED') {
    return {
      id: 'meeting',
      label: 'Revisión completada',
      body: 'La reunión de seguimiento ya está cerrada.',
      tone: 'complete',
      icon: CheckCircle2,
    }
  }

  if (status === 'ACKNOWLEDGED') {
    return {
      id: 'meeting',
      label: 'Reunión en preparación',
      body: 'Tu consultor ya tiene registrada la solicitud y preparará la revisión.',
      tone: 'active',
      icon: Clock3,
    }
  }

  if (status === 'PENDING') {
    return {
      id: 'meeting',
      label: 'Reunión solicitada',
      body: 'La solicitud está enviada y pendiente de confirmación por el consultor.',
      tone: 'active',
      icon: MessageSquareText,
    }
  }

  return {
    id: 'meeting',
    label: 'Solicitar revisión',
    body: 'Si algo requiere contexto, pide una reunión desde el detalle del informe.',
    tone: 'pending',
    icon: MessageSquareText,
  }
}

function toneClass(tone: RoadmapStepTone) {
  if (tone === 'complete') return 'border-emerald-200 bg-emerald-50 text-emerald-900'
  if (tone === 'active') return 'border-amber-200 bg-amber-50 text-amber-950'
  return 'border-slate-200 bg-slate-50 text-slate-700'
}

export function PortalReviewRoadmap({ viewedAt, meetingStatus, suggestedActionCount }: PortalReviewRoadmapProps) {
  const steps: RoadmapStep[] = [
    {
      id: 'published',
      label: 'Informe publicado',
      body: 'El consultor ha dejado una versión revisada disponible en el portal.',
      tone: 'complete',
      icon: FileText,
    },
    {
      id: 'read',
      label: viewedAt ? 'Informe leído' : 'Pendiente de lectura',
      body: viewedAt
        ? 'El detalle ya se ha abierto desde el portal cliente.'
        : 'Abre el informe completo para revisar conclusiones, KPIs y capítulos.',
      tone: viewedAt ? 'complete' : 'active',
      icon: Eye,
    },
    meetingStep(meetingStatus),
    {
      id: 'actions',
      label: suggestedActionCount > 0 ? 'Próximas acciones definidas' : 'Sin acciones urgentes',
      body: suggestedActionCount > 0
        ? `${suggestedActionCount} punto${suggestedActionCount === 1 ? '' : 's'} recomendado${suggestedActionCount === 1 ? '' : 's'} para revisar con el consultor.`
        : 'El informe no contiene acciones destacadas; conviene revisar el histórico y mantener seguimiento.',
      tone: suggestedActionCount > 0 ? 'active' : 'pending',
      icon: CheckCircle2,
    },
  ]

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Recorrido de revisión</p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">Del informe a la decisión</h2>
        </div>
        <p className="max-w-sm text-sm leading-6 text-slate-600">
          Sigue el estado de la entrega y decide si necesitas revisión con tu consultor.
        </p>
      </div>

      <ol className="mt-5 grid gap-3 md:grid-cols-2">
        {steps.map((step, index) => {
          const Icon = step.icon
          return (
            <li key={step.id} className={`rounded-lg border p-4 ${toneClass(step.tone)}`}>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">Paso {index + 1}</p>
                  <p className="mt-1 text-sm font-bold">{step.label}</p>
                  <p className="mt-2 text-xs leading-5 opacity-80">{step.body}</p>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
