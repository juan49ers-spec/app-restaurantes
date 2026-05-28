import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createAdminClientWorkspace } from '@/app/actions/admin'
import { ClientOnboardingWizard } from '@/components/admin/ClientOnboardingWizard'
import type { AdminConsultantAccessData } from '@/app/actions/admin-queries'

vi.mock('@/app/actions/admin', () => ({
  createAdminClientWorkspace: vi.fn(async () => ({
    success: true,
    restaurantId: '22222222-2222-4222-8222-222222222222',
    restaurantName: 'Nuevo Cliente',
  })),
}))

const data: AdminConsultantAccessData = {
  users: [{
    id: '11111111-1111-4111-8111-111111111111',
    email: 'consultor@controlhub.es',
    created_at: '2026-01-01T00:00:00.000Z',
    last_sign_in_at: null,
    restaurant_id: null,
    restaurant_name: null,
    is_admin: false,
  }],
  restaurants: [],
  relationships: [],
}

describe('ClientOnboardingWizard', () => {
  it('creates a client workspace with owner and consultant assignment', async () => {
    render(<ClientOnboardingWizard data={data} />)

    fireEvent.change(screen.getByLabelText('Nombre del restaurante'), {
      target: { value: 'Nuevo Cliente' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Crear cliente/i }))

    await waitFor(() => {
      expect(createAdminClientWorkspace).toHaveBeenCalledWith({
        restaurantName: 'Nuevo Cliente',
        ownerUserId: data.users[0].id,
        consultantUserId: data.users[0].id,
      })
    })
    expect(await screen.findByText('Nuevo Cliente creado correctamente.')).toBeInTheDocument()
  })
})
