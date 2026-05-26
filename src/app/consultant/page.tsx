import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BriefcaseBusiness, FileCheck2, FileText, Send } from 'lucide-react'
import { getConsultantWorkspace } from '@/app/actions/consultant'
import { ConsultantBrandingForm } from '@/components/consultant/ConsultantBrandingForm'
import { MeetingRequestsPanel } from '@/components/consultant/MeetingRequestsPanel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export default async function ConsultantWorkspacePage() {
  const response = await getConsultantWorkspace()

  if (!response.success || !response.data) {
    if (response.error === 'No hay restaurante activo.') redirect('/onboarding')
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-800">
          <h1 className="text-lg font-semibold">No se pudo cargar la mesa de consultoría</h1>
          <p className="mt-2 text-sm">{response.error || 'Error inesperado.'}</p>
        </section>
      </main>
    )
  }

  const { restaurant, publishedReports, meetingRequests } = response.data
  const openRequests = meetingRequests.filter(request => request.status !== 'COMPLETED').length
  const latestReport = publishedReports[0]

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mesa de consultoría</p>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{restaurant.name}</h1>
              </div>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
              Espacio interno para preparar la entrega: revisar informes publicados, gestionar solicitudes del cliente y configurar la identidad visible en el portal.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/reports">
                <FileText className="h-4 w-4" />
                Mesa de informes
              </Link>
            </Button>
            <Button asChild>
              <Link href="/portal">
                <Send className="h-4 w-4" />
                Ver portal cliente
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <FileCheck2 className="h-4 w-4" />
            <p className="text-sm font-medium">Informes publicados</p>
          </div>
          <p className="mt-4 text-3xl font-semibold text-slate-950">{publishedReports.length}</p>
          <p className="mt-2 text-sm text-slate-500">Versiones visibles en el portal cliente.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <BriefcaseBusiness className="h-4 w-4" />
            <p className="text-sm font-medium">Solicitudes abiertas</p>
          </div>
          <p className="mt-4 text-3xl font-semibold text-slate-950">{openRequests}</p>
          <p className="mt-2 text-sm text-slate-500">Reuniones pendientes de seguimiento.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Última publicación</p>
          <p className="mt-4 text-2xl font-semibold text-slate-950">
            {latestReport ? formatDate(latestReport.publishedAt) : 'Sin publicar'}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {latestReport ? `${latestReport.periodFrom} a ${latestReport.periodTo}` : 'Aún no hay informe visible.'}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <MeetingRequestsPanel initialRequests={meetingRequests} />
        <ConsultantBrandingForm restaurant={restaurant} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Entrega al cliente</p>
            <h2 className="text-lg font-semibold text-slate-950">Informes publicados</h2>
          </div>
          <Button asChild variant="outline">
            <Link href="/reports">Preparar nuevo informe</Link>
          </Button>
        </div>

        <div className="mt-5 grid gap-3">
          {publishedReports.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 p-5 text-sm text-slate-500">
              Todavía no hay informes publicados para este restaurante.
            </div>
          ) : (
            publishedReports.map(report => (
              <article key={report.id} className="flex flex-col gap-3 rounded-md border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-950">{report.periodFrom} a {report.periodTo}</p>
                    <Badge variant="secondary" className="rounded-md">{report.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Versión {report.version} · publicado {formatDate(report.publishedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/portal/reports/${report.id}`}>Ver en portal</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/reports/print/${report.id}`} target="_blank" rel="noreferrer">PDF</Link>
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  )
}
