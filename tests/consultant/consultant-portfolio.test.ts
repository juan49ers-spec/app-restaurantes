import { describe, expect, it } from 'vitest'
import {
  mapConsultantClientRow,
  mapOwnedRestaurantClient,
  mergeConsultantPortfolio,
} from '@/lib/consultant'

describe('consultant portfolio helpers', () => {
  it('maps an owned restaurant as the active owner client', () => {
    const result = mapOwnedRestaurantClient({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Txiquita Tasca',
      consultant_name: 'ControlHub',
    }, '11111111-1111-4111-8111-111111111111')

    expect(result).toEqual({
      restaurantId: '11111111-1111-4111-8111-111111111111',
      name: 'Txiquita Tasca',
      role: 'OWNER',
      status: 'ACTIVE',
      consultantName: 'ControlHub',
      isActive: true,
    })
  })

  it('maps a linked consultant client from a joined restaurant row', () => {
    const result = mapConsultantClientRow({
      restaurant_id: '22222222-2222-4222-8222-222222222222',
      role: 'CONSULTANT',
      status: 'ACTIVE',
      restaurants: {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'La Chamaca',
        consultant_name: null,
      },
    }, '11111111-1111-4111-8111-111111111111')

    expect(result).toEqual({
      restaurantId: '22222222-2222-4222-8222-222222222222',
      name: 'La Chamaca',
      role: 'CONSULTANT',
      status: 'ACTIVE',
      consultantName: null,
      isActive: false,
    })
  })

  it('merges linked and owned clients with owned rows winning duplicates', () => {
    const linked = [{
      restaurantId: '11111111-1111-4111-8111-111111111111',
      name: 'Old Name',
      role: 'CONSULTANT' as const,
      status: 'ACTIVE' as const,
      consultantName: null,
      isActive: false,
    }]
    const owned = [{
      restaurantId: '11111111-1111-4111-8111-111111111111',
      name: 'Txiquita Tasca',
      role: 'OWNER' as const,
      status: 'ACTIVE' as const,
      consultantName: 'ControlHub',
      isActive: true,
    }]

    expect(mergeConsultantPortfolio(owned, linked)).toEqual(owned)
  })
})
