/**
 * TESTS UNITARIOS: Financial Control - Insight Generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock date-fns
const mockFormat = vi.fn().mockReturnValue('2024-02-01')
const mockStartOfMonth = vi.fn().mockReturnValue(new Date('2024-02-01'))
const mockEndOfMonth = vi.fn().mockReturnValue(new Date('2024-02-29'))
const mockSubMonths = vi.fn().mockReturnValue(new Date('2024-01-01'))

vi.mock('date-fns', () => ({
  format: (...args: any[]) => mockFormat(...args),
  startOfMonth: (...args: any[]) => mockStartOfMonth(...args),
  endOfMonth: (...args: any[]) => mockEndOfMonth(...args),
  subMonths: (...args: any[]) => mockSubMonths(...args)
}))

// Mock chain
let mockResponseQueue: Array<{ data: any; error: any }> = []
let queryIndex = 0

const createMockChain = () => {
  queryIndex = 0
  return {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockImplementation(() => {
      const response = mockResponseQueue[queryIndex++] || { data: [], error: null }
      return Promise.resolve(response)
    })
  }
}

let mockSupabase = createMockChain()

vi.mock('@/lib/supabaseServer', () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase))
}))

vi.mock('@/app/actions/utils', () => ({
  getUserRestaurant: vi.fn().mockResolvedValue('550e8400-e29b-41d4-a716-446655440000')
}))

describe('Financial Control - Insight Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponseQueue = []
    queryIndex = 0
    mockSupabase = createMockChain()
  })

  it('debería existir getExpenseDashboardData', async () => {
    const { getExpenseDashboardData } = await import('@/app/actions/financial-control')
    expect(getExpenseDashboardData).toBeDefined()
    expect(typeof getExpenseDashboardData).toBe('function')
  })

  it('debería ejecutar getExpenseDashboardData exitosamente', async () => {
    const { getExpenseDashboardData } = await import('@/app/actions/financial-control')
    
    mockResponseQueue = [
      { data: [{ category: 'NOMINAS', amount: 1000 }], error: null },
      { data: [{ category: 'NOMINAS', amount: 900 }], error: null },
      { data: [{ revenue_total: 10000 }], error: null }
    ]

    // 6 queries para historial
    for (let i = 0; i < 6; i++) {
      mockResponseQueue.push({ data: [], error: null })
    }

    const result = await getExpenseDashboardData('rest-123', '2024-02')

    expect(result).toBeDefined()
    expect(result.categories).toBeDefined()
  })
})
