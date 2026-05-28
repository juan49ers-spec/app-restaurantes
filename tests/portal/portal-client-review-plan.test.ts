import { describe, expect, it } from 'vitest'
import {
  buildPortalClientReviewPlan,
  type PortalSuggestedAction,
} from '@/lib/portal-insights'

const actions: PortalSuggestedAction[] = [
  {
    id: 'review-prime-cost',
    title: 'Revisar prime cost',
    body: 'Cruzar compras, personal y carta.',
    tone: 'warning',
    sourceId: 'prime_cost_pct',
  },
]

describe('buildPortalClientReviewPlan', () => {
  it('starts with reading the report when the detail has not been opened yet', () => {
    const plan = buildPortalClientReviewPlan({
      viewedAt: null,
      meetingStatus: null,
      suggestedActions: actions,
    })

    expect(plan.status).toBe('READ_REPORT')
    expect(plan.primaryAction).toEqual({
      label: 'Abrir informe completo',
      href: '#resumen-ejecutivo',
    })
    expect(plan.items.find(item => item.id === 'read-report')?.status).toBe('current')
  })

  it('asks the client to review priorities before requesting a meeting', () => {
    const plan = buildPortalClientReviewPlan({
      viewedAt: '2026-05-28T10:00:00.000Z',
      meetingStatus: null,
      suggestedActions: actions,
    })

    expect(plan.status).toBe('REVIEW_PRIORITIES')
    expect(plan.primaryAction).toEqual({
      label: 'Revisar prioridades',
      href: '#acciones-sugeridas',
    })
    expect(plan.items.find(item => item.id === 'review-actions')?.status).toBe('current')
  })

  it('tracks an open meeting request as the active step', () => {
    const plan = buildPortalClientReviewPlan({
      viewedAt: '2026-05-28T10:00:00.000Z',
      meetingStatus: 'PENDING',
      suggestedActions: actions,
    })

    expect(plan.status).toBe('MEETING_REQUESTED')
    expect(plan.primaryAction).toEqual({
      label: 'Ver solicitud',
      href: '#solicitar-reunion',
    })
    expect(plan.items.find(item => item.id === 'meeting')?.status).toBe('current')
  })

  it('marks the review as completed when the meeting is closed', () => {
    const plan = buildPortalClientReviewPlan({
      viewedAt: '2026-05-28T10:00:00.000Z',
      meetingStatus: 'COMPLETED',
      suggestedActions: [],
    })

    expect(plan.status).toBe('REVIEW_COMPLETED')
    expect(plan.primaryAction).toEqual({
      label: 'Volver al histórico',
      href: '/portal',
    })
    expect(plan.items.every(item => item.status === 'done')).toBe(true)
  })
})
