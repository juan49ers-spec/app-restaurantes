import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PortalClientReviewPlan } from '@/components/portal/PortalClientReviewPlan'
import type { PortalClientReviewPlan as PortalClientReviewPlanModel } from '@/lib/portal-insights'

const plan: PortalClientReviewPlanModel = {
  status: 'REVIEW_PRIORITIES',
  headline: 'Prepara las prioridades de la reunión',
  summary: 'Revisa las acciones sugeridas y pide reunión si quieres aterrizarlas con tu consultor.',
  primaryAction: {
    label: 'Revisar prioridades',
    href: '#acciones-sugeridas',
  },
  items: [
    {
      id: 'read-report',
      label: 'Informe leído',
      body: 'El detalle ya se ha abierto.',
      status: 'done',
    },
    {
      id: 'review-actions',
      label: 'Revisar acciones sugeridas',
      body: 'Prioriza los puntos que quieras tratar con el consultor.',
      status: 'current',
    },
    {
      id: 'meeting',
      label: 'Solicitar reunión',
      body: 'Abre seguimiento si necesitas contexto.',
      status: 'pending',
    },
  ],
}

describe('PortalClientReviewPlan', () => {
  it('renders the review plan headline, primary action and steps', () => {
    render(<PortalClientReviewPlan plan={plan} />)

    expect(screen.getByText('Plan de revisión')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Prepara las prioridades de la reunión' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Revisar prioridades/i })).toHaveAttribute('href', '#acciones-sugeridas')

    const list = screen.getByRole('list', { name: /Pasos del plan de revisión/i })
    expect(within(list).getByText('Informe leído')).toBeInTheDocument()
    expect(within(list).getByText('Revisar acciones sugeridas')).toBeInTheDocument()
    expect(within(list).getByText('Solicitar reunión')).toBeInTheDocument()
    expect(screen.getByText('Ahora')).toBeInTheDocument()
  })
})
