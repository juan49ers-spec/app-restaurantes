import { notFound } from 'next/navigation'
import { getSavedProfessionalReportDraft } from '@/app/actions/professional-reporting'
import { getCurrentRestaurant } from '@/app/actions/user'
import { PrintReportButton } from '@/components/reports/PrintReportButton'
import { ProfessionalReportPrintDocument } from '@/components/reports/ProfessionalReportPrintDocument'

interface PrintReportPageProps {
  params: Promise<{
    draftId: string
  }>
}

export default async function PrintReportPage({ params }: PrintReportPageProps) {
  const { draftId } = await params
  const [response, restaurant] = await Promise.all([
    getSavedProfessionalReportDraft(draftId),
    getCurrentRestaurant(),
  ])

  if (!response.success || !response.data) {
    notFound()
  }

  const draft = response.data
  const restaurantWithConsultant = restaurant as typeof restaurant & {
    consultant_name?: string | null
    consultant_email?: string | null
    consultant_logo_url?: string | null
  }

  return (
    <main className="min-h-screen bg-[#f5f2ec] text-slate-950 print:bg-white">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-950">Informe versión {draft.version}</p>
            <p className="text-xs text-slate-500">{draft.report.restaurant.name}</p>
          </div>
          <PrintReportButton draftId={draft.id} />
        </div>
      </div>

      <ProfessionalReportPrintDocument
        draft={draft}
        branding={{
          consultantName: restaurantWithConsultant?.consultant_name,
          consultantEmail: restaurantWithConsultant?.consultant_email,
          consultantLogoUrl: restaurantWithConsultant?.consultant_logo_url,
        }}
      />
    </main>
  )
}
