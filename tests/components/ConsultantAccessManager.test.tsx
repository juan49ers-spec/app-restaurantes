import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConsultantAccessManager } from '@/components/admin/ConsultantAccessManager'
import type { AdminConsultantAccessData } from '@/app/actions/admin-queries'

vi.mock('@/app/actions/admin', () => ({
  upsertConsultantRestaurantAccess: vi.fn(),
  updateConsultantRestaurantAccessStatus: vi.fn(),
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
  restaurants: [{
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Txiquita Tasca',
  }],
  relationships: [{
    id: '33333333-3333-4333-8333-333333333333',
    consultant_user_id: '11111111-1111-4111-8111-111111111111',
    restaurant_id: '22222222-2222-4222-8222-222222222222',
    role: 'CONSULTANT',
    status: 'ACTIVE',
    created_at: '2026-05-28T10:00:00.000Z',
  }],
}

describe('ConsultantAccessManager', () => {
  it('renders consultant access form and existing relationships', () => {
    render(<ConsultantAccessManager data={data} />)

    expect(screen.getByText('Asignar consultor a restaurante')).toBeInTheDocument()
    expect(screen.getByLabelText('Consultor')).toHaveValue(data.users[0].id)
    expect(screen.getByLabelText('Restaurante')).toHaveValue(data.restaurants[0].id)
    expect(screen.getAllByText('consultor@controlhub.es').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Txiquita Tasca').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Activo').length).toBeGreaterThan(0)
  })
})
