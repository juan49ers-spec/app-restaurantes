import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PortalReportSummary } from '@/components/portal/PortalReportSummary'
import type { PublishedReportSummary } from '@/app/actions/portal'

function report(overrides: Partial<PublishedReportSummary>): PublishedReportSummary {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    periodFrom: '2026-05-01',
    periodTo: '2026-05-31',
    version: 2,
    status: 'READY',
    schemaVersion: 'professional-report/v1',
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
    exportedAt: null,
    publishedAt: '2026-06-01T11:00:00.000Z',
    publishedBy: 'user-1',
    viewedAt: null,
    meetingStatus: null,
    ...overrides,
  }
}

describe('PortalReportSummary', () => {
  it.each([
    [report({ viewedAt: null, meetingStatus: null }), 'Nuevo'],
    [report({ viewedAt: '2026-06-02T10:00:00.000Z', meetingStatus: null }), 'Leído'],
    [report({ meetingStatus: 'PENDING' }), 'Reunión solicitada'],
    [report({ meetingStatus: 'ACKNOWLEDGED' }), 'Reunión en preparación'],
    [report({ meetingStatus: 'COMPLETED' }), 'Revisado'],
  ])('renders the delivery badge %s', (summary, expectedLabel) => {
    render(<PortalReportSummary report={summary} />)

    expect(screen.getByText(expectedLabel)).toBeInTheDocument()
  })
})
