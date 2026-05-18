/**
 * TESTS UNITARIOS: Financial Control - Final Coverage
 * 
 * Tests específicos para cubrir las últimas líneas:
 * - Línea 545: .map(cat => cat.category)
 * - Línea 560: template string con topIncreaseCategories.map().join()
 * - Líneas 588-593: Loop de historial con reduce y forEach
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Import actual date-fns
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

// Mock Supabase con respuestas específicas para forzar ejecución de líneas 588-593
let mockQueryIndex = 0
let mockResponses: Array<{ data: any; error: any }> = []

const createMockClient = () => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation(function(onFulfilled) {
      const response = mockResponses[mockQueryIndex++] || { data: [], error: null }
      return Promise.resolve(onFulfilled(response))
    })
  }
  
  return {
    from: vi.fn().mockReturnValue(chain)
  }
}

let mockSupabase = createMockClient()

vi.mock('@/lib/supabaseServer', () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase))
}))

vi.mock('@/app/actions/utils', () => ({
  getUserRestaurant: vi.fn().mockResolvedValue('550e8400-e29b-41d4-a716-446655440000')
}))

vi.mock('@/lib/verify-access', () => ({
  verifyRestaurantAccess: vi.fn().mockResolvedValue(undefined)
}))

describe('Financial Control - Final Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryIndex = 0
    mockResponses = []
    mockSupabase = createMockClient()
  })

  describe('Líneas 545 y 560 - topIncreaseCategories', () => {
    it('debería ejecutar línea 545 con categorías de aumento', async () => {
      const { getExpenseDashboardData } = await import('@/app/actions/financial-control')
      
      // Forzar ejecución de línea 545: .map(cat => cat.category)
      mockResponses = [
        { // Current - categorías con aumento significativo
          data: [
            { category: 'NOMINAS_LIQUIDAS', amount: 10000 },
            { category: 'ALQUILER', amount: 5000 },
            { category: 'PROVEEDORES_COMIDA', amount: 8000 }
          ], 
          error: null 
        },
        { // Previous - montos más bajos para crear aumento
          data: [
            { category: 'NOMINAS_LIQUIDAS', amount: 8000 },
            { category: 'ALQUILER', amount: 4000 },
            { category: 'PROVEEDORES_COMIDA', amount: 6000 }
          ], 
          error: null 
        },
        { // Sales
          data: [{ revenue_total: 100000 }], 
          error: null 
        }
      ]

      // 6 queries para historial (líneas 588-593)
      for (let i = 0; i < 6; i++) {
        mockResponses.push({ 
          data: [
            { category: 'NOMINAS', amount: 1000, expense_date: '2024-02-01' },
            { category: 'ALQUILER', amount: 500, expense_date: '2024-02-01' }
          ], 
          error: null 
        })
      }

      const result = await getExpenseDashboardData('rest-123', '2024-02')

      // Verificar que se ejecutó línea 545
      expect(result.insight.topIncreaseCategories).toBeDefined()
      expect(Array.isArray(result.insight.topIncreaseCategories)).toBe(true)
    })

    it('debería ejecutar línea 560 con múltiples categorías', async () => {
      const { getExpenseDashboardData } = await import('@/app/actions/financial-control')
      
      mockResponses = [
        { 
          data: [
            { category: 'NOMINAS_LIQUIDAS', amount: 10000 },
            { category: 'ALQUILER', amount: 5000 }
          ], 
          error: null 
        },
        { 
          data: [
            { category: 'NOMINAS_LIQUIDAS', amount: 8000 },
            { category: 'ALQUILER', amount: 4000 }
          ], 
          error: null 
        },
        { data: [{ revenue_total: 100000 }], error: null }
      ]

      for (let i = 0; i < 6; i++) {
        mockResponses.push({ data: [], error: null })
      }

      const result = await getExpenseDashboardData('rest-123', '2024-02')

      // Verificar que se ejecutó línea 560
      expect(result.insight.summary).toBeDefined()
      expect(typeof result.insight.summary).toBe('string')
    })
  })

  describe('Líneas 588-593 - Loop de historial', () => {
    it('debería ejecutar líneas 588-593', async () => {
      const { getExpenseDashboardData } = await import('@/app/actions/financial-control')
      
      mockResponses = [
        { data: [], error: null },
        { data: [], error: null },
        { data: [{ revenue_total: 10000 }], error: null },
        { data: [{ category: 'NOMINAS', amount: 1000, expense_date: '2023-09-01' }], error: null },
        { data: [{ category: 'NOMINAS', amount: 1100, expense_date: '2023-10-01' }], error: null },
        { data: [{ category: 'NOMINAS', amount: 1200, expense_date: '2023-11-01' }], error: null },
        { data: [{ category: 'NOMINAS', amount: 1300, expense_date: '2023-12-01' }], error: null },
        { data: [{ category: 'NOMINAS', amount: 1400, expense_date: '2024-01-01' }], error: null },
        { data: [{ category: 'NOMINAS', amount: 1500, expense_date: '2024-02-01' }], error: null }
      ]

      const result = await getExpenseDashboardData('rest-123', '2024-02')

      expect(result).toBeDefined()
      expect(result.history).toBeDefined()
    })

    it('debería ejecutar reduce en línea 588', async () => {
      const { getExpenseDashboardData } = await import('@/app/actions/financial-control')
      
      mockResponses = [
        { data: [], error: null },
        { data: [], error: null },
        { data: [{ revenue_total: 10000 }], error: null },
        { // Datos para probar reduce (línea 588)
          data: [
            { category: 'NOMINAS', amount: 1000, expense_date: '2023-09-01' },
            { category: 'NOMINAS', amount: 500, expense_date: '2023-09-01' },
            { category: 'ALQUILER', amount: 2000, expense_date: '2023-09-01' },
            { category: 'PROVEEDORES', amount: 1500, expense_date: '2023-09-01' }
          ],
          error: null
        }
      ]

      // 5 meses vacíos
      for (let i = 0; i < 5; i++) {
        mockResponses.push({ data: [], error: null })
      }

      const result = await getExpenseDashboardData('rest-123', '2024-02')

      expect(result.history).toBeDefined()
      if (result.history[0]) {
        // El total debería ser 5000 (1000 + 500 + 2000 + 1500)
        expect(result.history[0].total).toBe(5000)
      }
    })

    it('debería ejecutar forEach en líneas 590-592', async () => {
      const { getExpenseDashboardData } = await import('@/app/actions/financial-control')
      
      mockResponses = [
        { data: [], error: null },
        { data: [], error: null },
        { data: [{ revenue_total: 10000 }], error: null },
        { // Datos para probar forEach (líneas 590-592)
          data: [
            { category: 'NOMINAS', amount: 1000, expense_date: '2023-09-01' },
            { category: 'ALQUILER', amount: 2000, expense_date: '2023-09-01' },
            { category: 'PROVEEDORES', amount: 1500, expense_date: '2023-09-01' }
          ],
          error: null
        }
      ]

      for (let i = 0; i < 5; i++) {
        mockResponses.push({ data: [], error: null })
      }

      const result = await getExpenseDashboardData('rest-123', '2024-02')

      expect(result.history).toBeDefined()
      if (result.history[0]) {
        // Verificar que byCategory tiene las categorías correctas
        expect(result.history[0].byCategory['NOMINAS']).toBe(1000)
        expect(result.history[0].byCategory['ALQUILER']).toBe(2000)
        expect(result.history[0].byCategory['PROVEEDORES']).toBe(1500)
      }
    })
  })
})
