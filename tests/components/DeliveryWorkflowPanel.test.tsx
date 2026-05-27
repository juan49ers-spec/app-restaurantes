import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DeliveryWorkflowPanel } from '@/components/consultant/DeliveryWorkflowPanel'
import type { ConsultantDeliveryReport } from '@/app/actions/consultant'

const reports: ConsultantDeliveryReport[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    periodFrom: '2026-02-01',
    periodTo: '2026-02-28',
    version: 1,
    publishedAt: null,
    viewedAt: null,
    status: 'READY_TO_PUBLISH',
    openRequestCount: 0,
    completedRequestCount: 0,
    nextActionHref: '/reports?from=2026-02-01&to=2026-02-28',
    nextActionLabel: 'Publicar desde informes',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    periodFrom: '2026-03-01',
    periodTo: '2026-03-31',
    version: 2,
    publishedAt: '2026-04-02T10:00:00.000Z',
    viewedAt: '2026-04-03T09:30:00.000Z',
    status: 'MEETING_REQUESTED',
    openRequestCount: 1,
    completedRequestCount: 0,
    nextActionHref: '/consultant',
    nextActionLabel: 'Atender solicitud',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    periodFrom: '2026-04-01',
    periodTo: '2026-04-30',
    version: 1,
    publishedAt: '2026-05-02T10:00:00.000Z',
    viewedAt: null,
    status: 'FOLLOW_UP_COMPLETE',
    openRequestCount: 0,
    completedRequestCount: 1,
    nextActionHref: '/portal/reports/33333333-3333-4333-8333-333333333333',
    nextActionLabel: 'Ver entrega',
  },
]

describe('DeliveryWorkflowPanel', () => {
  it('renders priority count and delivery timeline', () => {
    render(<DeliveryWorkflowPanel reports={reports} />)

    expect(screen.getByText('2 requieren acción')).toBeInTheDocument()
    expect(screen.getAllByText('READY')).toHaveLength(3)
    expect(screen.getAllByText('Portal')).toHaveLength(3)
    expect(screen.getAllByText('Reunión')).toHaveLength(3)
    expect(screen.getAllByText('Cierre')).toHaveLength(3)
    expect(screen.getByText(/Visto por el cliente/)).toBeInTheDocument()
  })

  it('filters open and closed deliveries locally', () => {
    render(<DeliveryWorkflowPanel reports={reports} />)

    fireEvent.click(screen.getByRole('button', { name: 'Abiertos (2)' }))
    expect(screen.getByText('2026-02-01 a 2026-02-28')).toBeInTheDocument()
    expect(screen.getByText('2026-03-01 a 2026-03-31')).toBeInTheDocument()
    expect(screen.queryByText('2026-04-01 a 2026-04-30')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrados (1)' }))
    expect(screen.queryByText('2026-02-01 a 2026-02-28')).not.toBeInTheDocument()
    expect(screen.getByText('2026-04-01 a 2026-04-30')).toBeInTheDocument()
  })
})
