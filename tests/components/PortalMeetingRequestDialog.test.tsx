import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PortalMeetingRequestDialog } from '@/components/portal/PortalMeetingRequestDialog'

const requestConsultantMeeting = vi.fn()

vi.mock('@/app/actions/portal', () => ({
  requestConsultantMeeting: (input: unknown) => requestConsultantMeeting(input),
}))

describe('PortalMeetingRequestDialog', () => {
  beforeEach(() => {
    requestConsultantMeeting.mockReset()
  })

  it('submits a meeting request with an optional message', async () => {
    requestConsultantMeeting.mockResolvedValueOnce({ success: true, data: { id: 'request-1' } })
    render(<PortalMeetingRequestDialog reportId="11111111-1111-4111-8111-111111111111" />)

    fireEvent.change(screen.getByPlaceholderText('Mensaje opcional para tu consultor'), {
      target: { value: 'Quiero revisar el informe esta semana.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Solicitar reunión/i }))

    await waitFor(() => {
      expect(requestConsultantMeeting).toHaveBeenCalledWith({
        reportId: '11111111-1111-4111-8111-111111111111',
        message: 'Quiero revisar el informe esta semana.',
      })
    })
    expect(await screen.findByText('Solicitud enviada.')).toBeInTheDocument()
  })
})
