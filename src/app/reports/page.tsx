import { redirect } from 'next/navigation'
import { getProfessionalReportDraft, getProfessionalReportDraftHistory } from '@/app/actions/professional-reporting'
import { getCurrentRestaurant } from '@/app/actions/user'
import { ProfessionalReportReview } from '@/components/reports/ProfessionalReportReview'

interface ReportsPageProps {
  searchParams: Promise<{
    from?: string
    to?: string
  }>
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10)
}

function defaultPeriod() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  return {
    from: formatDateInput(from),
    to: formatDateInput(to),
  }
}

function isDateInput(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const restaurant = await getCurrentRestaurant()

  if (!restaurant) {
    redirect('/onboarding')
  }

  const params = await searchParams
  const fallback = defaultPeriod()
  const period = {
    from: isDateInput(params.from) ? params.from! : fallback.from,
    to: isDateInput(params.to) ? params.to! : fallback.to,
  }

  const [response, historyResponse] = await Promise.all([
    getProfessionalReportDraft(period),
    getProfessionalReportDraftHistory(period),
  ])

  return (
    <ProfessionalReportReview
      initialPeriod={period}
      report={response.data ?? null}
      error={response.error ?? null}
      savedDrafts={historyResponse.data ?? []}
    />
  )
}
