import { fireEvent, render, screen } from '@testing-library/react'
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
  }, {
    id: '44444444-4444-4444-8444-444444444444',
    email: 'segundo@controlhub.es',
    created_at: '2026-01-02T00:00:00.000Z',
    last_sign_in_at: null,
    restaurant_id: null,
    restaurant_name: null,
    is_admin: false,
  }],
  restaurants: [{
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Txiquita Tasca',
  }, {
    id: '55555555-5555-4555-8555-555555555555',
    name: 'La Favorita',
  }],
  relationships: [{
    id: '33333333-3333-4333-8333-333333333333',
    consultant_user_id: '11111111-1111-4111-8111-111111111111',
    restaurant_id: '22222222-2222-4222-8222-222222222222',
    role: 'CONSULTANT',
    status: 'ACTIVE',
    created_at: '2026-05-28T10:00:00.000Z',
  }, {
    id: '66666666-6666-4666-8666-666666666666',
    consultant_user_id: '44444444-4444-4444-8444-444444444444',
    restaurant_id: '55555555-5555-4555-8555-555555555555',
    role: 'VIEWER',
    status: 'PAUSED',
    created_at: '2026-05-28T11:00:00.000Z',
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
    expect(screen.getByText('Cartera por consultor')).toBeInTheDocument()
    expect(screen.getByText('2 de 2 relaciones visibles')).toBeInTheDocument()
    expect(screen.getByText(/Ya existe una relación para este consultor y restaurante/)).toBeInTheDocument()
  })

  it('filters existing relationships by status and search term', () => {
    render(<ConsultantAccessManager data={data} />)

    fireEvent.change(screen.getByLabelText('Filtrar por estado'), {
      target: { value: 'PAUSED' },
    })

    expect(screen.getByText('1 de 2 relaciones visibles')).toBeInTheDocument()
    expect(screen.getAllByText('segundo@controlhub.es').length).toBeGreaterThan(0)

    fireEvent.change(screen.getByLabelText('Buscar relación'), {
      target: { value: 'favorita' },
    })

    expect(screen.getAllByText('La Favorita').length).toBeGreaterThan(0)
  })
})
