import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PortalMeetingRequestDialog } from '@/components/portal/PortalMeetingRequestDialog'

const fetchMock = vi.fn()

describe('PortalMeetingRequestDialog', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    window.sessionStorage.clear()
  })

  it('submits a meeting request with an optional message', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ success: true, data: { id: 'request-1', reused: false } }),
    })
    render(<PortalMeetingRequestDialog reportId="11111111-1111-4111-8111-111111111111" />)

    fireEvent.change(screen.getByPlaceholderText('Mensaje opcional para tu consultor'), {
      target: { value: 'Quiero revisar el informe esta semana.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Solicitar reunión/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/portal/meeting-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: '11111111-1111-4111-8111-111111111111',
          message: 'Quiero revisar el informe esta semana.',
        }),
      })
    })
    expect(await screen.findByText('Solicitud enviada. Tu consultor la verá en su mesa de trabajo.')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Solicitud registrada/i })).toBeDisabled()
    })
  })

  it('shows an existing request message when the report already has an open request', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ success: true, data: { id: 'request-1', reused: true } }),
    })
    render(<PortalMeetingRequestDialog reportId="11111111-1111-4111-8111-111111111111" />)

    fireEvent.click(screen.getByRole('button', { name: /Solicitar reunión/i }))

    expect(await screen.findByText('Ya hay una solicitud abierta para este informe. Tu consultor la verá en su mesa de trabajo.')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Solicitud registrada/i })).toBeDisabled()
    })
  })
})
