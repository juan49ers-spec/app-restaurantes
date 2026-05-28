import Link from 'next/link'
import { ArrowRight, FileText, MonitorCheck, Printer, UsersRound } from 'lucide-react'

interface PortalDeliveryPackProps {
  reportId: string
}

const PACK_ITEMS = [
  {
    id: 'web',
    label: 'Informe web',
    body: 'Lectura interactiva con KPIs, capítulos, comparativas y acciones sugeridas.',
    icon: MonitorCheck,
  },
  {
    id: 'pdf',
    label: 'PDF imprimible',
    body: 'Versión formal para guardar, enviar o archivar como entregable mensual.',
    icon: Printer,
  },
  {
    id: 'review',
    label: 'Revisión con consultor',
    body: 'Solicitud de reunión para convertir conclusiones en decisiones operativas.',
    icon: UsersRound,
  },
] as const

export function PortalDeliveryPack({ reportId }: PortalDeliveryPackProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Paquete de entrega</p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">Todo lo necesario para revisar el periodo</h2>
        </div>
        <Link
          href={`/reports/print/${reportId}`}
          target="_blank"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-950 hover:text-red-700"
        >
          Abrir PDF <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {PACK_ITEMS.map(item => {
          const Icon = item.icon
          return (
            <article key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-900">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-slate-950">{item.label}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-600">{item.body}</p>
            </article>
          )
        })}
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-4 w-4 text-slate-500" />
          <p className="text-xs leading-5 text-slate-600">
            El PDF y el informe web salen del mismo snapshot publicado. Si el consultor despublica la versión, ambos dejan de estar disponibles desde el portal.
          </p>
        </div>
      </div>
    </section>
  )
}
