import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ClientPortfolioPanel } from '@/components/consultant/ClientPortfolioPanel'
import type { ConsultantClientSummary } from '@/app/actions/consultant'

const selectConsultantClient = vi.fn()

vi.mock('@/app/actions/consultant', () => ({
  selectConsultantClient: (input: unknown) => selectConsultantClient(input),
}))

const clients: ConsultantClientSummary[] = [
  {
    restaurantId: '11111111-1111-4111-8111-111111111111',
    name: 'Txiquita Tasca',
    role: 'OWNER',
    status: 'ACTIVE',
    consultantName: 'ControlHub',
    isActive: true,
  },
  {
    restaurantId: '22222222-2222-4222-8222-222222222222',
    name: 'La Chamaca',
    role: 'CONSULTANT',
    status: 'ACTIVE',
    consultantName: null,
    isActive: false,
  },
]

describe('ClientPortfolioPanel', () => {
  it('renders multiple clients and highlights the active restaurant', () => {
    render(<ClientPortfolioPanel clients={clients} />)

    expect(screen.getByText('Cartera de clientes')).toBeInTheDocument()
    expect(screen.getByText('Txiquita Tasca')).toBeInTheDocument()
    expect(screen.getByText('La Chamaca')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Activo/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Abrir/i })).toBeEnabled()
  })

  it('calls the server action when opening another client', async () => {
    const location = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '' },
    })
    selectConsultantClient.mockResolvedValue({ success: true, data: { restaurantId: clients[1].restaurantId } })

    render(<ClientPortfolioPanel clients={clients} />)
    fireEvent.click(screen.getByRole('button', { name: /Abrir/i }))

    await waitFor(() => {
      expect(selectConsultantClient).toHaveBeenCalledWith({ restaurantId: clients[1].restaurantId })
    })
    expect(window.location.href).toBe('/consultant')

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: location,
    })
  })
})
