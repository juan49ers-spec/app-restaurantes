import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PrintReportButton } from '@/components/reports/PrintReportButton'
import { markProfessionalReportDraftExported } from '@/app/actions/professional-reporting'

vi.mock('@/app/actions/professional-reporting', () => ({
  markProfessionalReportDraftExported: vi.fn(async () => ({ success: true })),
}))

describe('PrintReportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.print = vi.fn()
  })

  it('marks the draft as exported before opening the browser PDF dialog', async () => {
    render(<PrintReportButton draftId="11111111-1111-4111-8111-111111111111" />)

    fireEvent.click(screen.getByRole('button', { name: /Guardar PDF/i }))

    await waitFor(() => {
      expect(markProfessionalReportDraftExported).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111')
    })
    await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1))
  })
})
