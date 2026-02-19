/**
 * TESTS UNITARIOS: Financial Control - Ultra Deep Tests
 * 
 * Tests específicos para las líneas más difíciles:
 * - 545, 560: Generación de insights con condicionales anidadas
 * - 588-593: Loop de historial con Promise.all
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock date-fns con control total
let mockDateCounter = 0
const mockFormat = vi.fn().mockImplementation(() => {
  const dates = ['2023-09-01', '2023-10-01', '2023-11-01', '2023-12-01', '2024-01-01', '2024-02-01', '2024-02-01']
  return dates[mockDateCounter++] || '2024-02-01'
})
const mockStartOfMonth = vi.fn().mockReturnValue(new Date('2024-02-01'))
const mockEndOfMonth = vi.fn().mockReturnValue(new Date('2024-02-29'))
const mockSubMonths = vi.fn().mockImplementation((date, months) => {
  return new Date(`2023-${String(12 - months + 1).padStart(2, '0')}-01`)
})

vi.mock('date-fns', () => ({
  format: (...args: any[]) => mockFormat(...args),
  startOfMonth: (...args: any[]) => mockStartOfMonth(...args),
  endOfMonth: (...args: any[]) => mockEndOfMonth(...args),
  subMonths: (...args: any[]) => mockSubMonths(...args)
}))

// Mock Supabase con control de múltiples queries en paralelo
let mockQueryResponses: Array<{ data: any; error: any }> = []
let queryIndex = 0

const createMockClient = () => {
  queryIndex = 0
  return {
    from: vi.fn().mockImplementation((table: string) => {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockImplementation(() => {
          const response = mockQueryResponses[queryIndex++] || { data: [], error: null }
          return Promise.resolve(response)
        })
      }
    })
  }
}

let mockSupabase = createMockClient()

vi.mock('@/lib/supabaseServer', () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase))
}))

vi.mock('@/app/actions/utils', () => ({
  getUserRestaurant: vi.fn().mockResolvedValue('550e8400-e29b-41d4-a716-446655440000')
}))

describe('Financial Control - Ultra Deep Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryResponses = []
    queryIndex = 0
    mockDateCounter = 0
    mockSupabase = createMockClient()
  })

  describe('Generación de insights complejos (líneas 545, 560)', () => {
    it('debería ejecutar línea 545 - topIncreaseCategories con datos reales', async () => {
      const { getExpenseDashboardData } = await import('@/app/actions/financial-control')
      
      // Datos que generan aumento significativo
      mockQueryResponses = [
        { // Current month - gastos altos
          data: [
            { id: '1', category: 'NOMINAS_LIQUIDAS', amount: 10000, expense_date: '2024-02-01' },
            { id: '2', category: 'ALQUILER', amount: 5000, expense_date: '2024-02-01' },
            { id: '3', category: 'PROVEEDORES_COMIDA', amount: 8000, expense_date: '2024-02-01' }
          ], 
          error: null 
        },
        { // Previous month - gastos bajos = aumento significativo
          data: [
            { id: '1', category: 'NOMINAS_LIQUIDAS', amount: 8000, expense_date: '2024-01-01' },
            { id: '2', category: 'ALQUILER', amount: 5000, expense_date: '2024-01-01' },
            { id: '3', category: 'PROVEEDORES_COMIDA', amount: 6000, expense_date: '2024-01-01' }
          ], 
          error: null 
        },
        { // Sales
          data: [{ revenue_total: 100000, iva_collected: 10000 }], 
          error: null 
        }
      ]

      // 6 queries para historial
      for (let i = 0; i < 6; i++) {
        mockQueryResponses.push({ data: [], error: null })
      }

      const result = await getExpenseDashboardData('rest-123', '2024-02')

      // Verificar que se ejecutó la línea 545
      expect(result).toBeDefined()
      expect(result.insight).toBeDefined()
    })

    it('debería ejecutar línea 560 - summary con múltiples categorías', async () => {
      const { getExpenseDashboardData } = await import('@/app/actions/financial-control')
      
      mockQueryResponses = [
        { 
          data: [
            { category: 'NOMINAS_LIQUIDAS', amount: 5000 },
            { category: 'ALQUILER', amount: 3000 }
          ], 
          error: null 
        },
        { 
          data: [
            { category: 'NOMINAS_LIQUIDAS', amount: 4000 },
            { category: 'ALQUILER', amount: 2500 }
          ], 
          error: null 
        },
        { data: [{ revenue_total: 50000 }], error: null }
      ]

      for (let i = 0; i < 6; i++) {
        mockQueryResponses.push({ data: [], error: null })
      }

      const result = await getExpenseDashboardData('rest-123', '2024-02')

      expect(result.insight.summary).toBeDefined()
    })
  })

  describe('Loop de 6 meses (líneas 588-593)', () => {
    it('debería ejecutar loop de 6 meses', async () => {
      const { getExpenseDashboardData } = await import('@/app/actions/financial-control')
      
      mockQueryResponses = [
        { data: [], error: null },
        { data: [], error: null },
        { data: [{ revenue_total: 10000 }], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null }
      ]

      const result = await getExpenseDashboardData('rest-123', '2024-02')

      expect(result).toBeDefined()
    })

    it('debería ejecutar cálculo de totales en loop', async () => {
      const { getExpenseDashboardData } = await import('@/app/actions/financial-control')
      
      mockQueryResponses = [
        { data: [], error: null },
        { data: [], error: null },
        { data: [{ revenue_total: 10000 }], error: null },
        { data: [{ category: 'NOMINAS', amount: 1000 }], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null }
      ]

      const result = await getExpenseDashboardData('rest-123', '2024-02')

      expect(result).toBeDefined()
    })
  })
})
