import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BriefcaseBusiness, FileCheck2, FileText, Send } from 'lucide-react'
import { getConsultantPortfolio, getConsultantWorkspace } from '@/app/actions/consultant'
import { ClientPortfolioPanel } from '@/components/consultant/ClientPortfolioPanel'
import { ConsultantBrandingForm } from '@/components/consultant/ConsultantBrandingForm'
import { DeliveryWorkflowPanel } from '@/components/consultant/DeliveryWorkflowPanel'
import { FirstReportGuidePanel } from '@/components/consultant/FirstReportGuidePanel'
import { MeetingRequestsPanel } from '@/components/consultant/MeetingRequestsPanel'
import { PreparationChecklist } from '@/components/consultant/PreparationChecklist'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buildFirstReportGuide } from '@/lib/consultant'
import { formatDateEs } from '@/lib/date-format'

export default async function ConsultantWorkspacePage() {
  const [response, portfolioResponse] = await Promise.all([
    getConsultantWorkspace(),
    getConsultantPortfolio(),
  ])

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

  const { restaurant, publishedReports, meetingRequests, deliveryReports, preparation, warnings } = response.data
  const portfolio = portfolioResponse.success ? portfolioResponse.data ?? [] : []
  const workspaceWarnings = portfolioResponse.success
    ? warnings
    : [...warnings, portfolioResponse.error || 'No se pudo cargar la cartera de clientes.']
  const openRequests = meetingRequests.filter(request => request.status !== 'COMPLETED').length
  const latestReport = publishedReports[0]
  const firstReportGuide = buildFirstReportGuide(preparation)

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

      {workspaceWarnings.length > 0 && (
        <Alert>
          <AlertTitle>Mesa cargada con avisos</AlertTitle>
          <AlertDescription>
            {workspaceWarnings.join(' ')}
          </AlertDescription>
        </Alert>
      )}

      <ClientPortfolioPanel clients={portfolio} />

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
            {latestReport ? formatDateEs(latestReport.publishedAt) : 'Sin publicar'}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {latestReport ? `${latestReport.periodFrom} a ${latestReport.periodTo}` : 'Aún no hay informe visible.'}
          </p>
        </div>
      </section>

      <PreparationChecklist initialChecklist={preparation} />

      <FirstReportGuidePanel guide={firstReportGuide} />

      <DeliveryWorkflowPanel reports={deliveryReports} />

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
                    Versión {report.version} · publicado {formatDateEs(report.publishedAt)}
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
