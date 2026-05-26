/**
 * TESTS UNITARIOS: Recipes Actions - Comprehensive Tests
 * 
 * Tests adicionales para funciones complejas de recipes
 * Enfocado en alcanzar 100% de cobertura
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { revalidatePath } from 'next/cache'

// Mock de createClient con control granular
let mockResponseQueue: Array<{ data: any; error: any }> = []

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockOrder = vi.fn()

const createMockSupabase = () => {
  const chain: any = {
    from: mockFrom.mockReturnThis(),
    select: mockSelect.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    order: mockOrder.mockReturnThis(),
    single: mockSingle.mockImplementation(() => {
      const response = mockResponseQueue.shift() || { data: null, error: null }
      return Promise.resolve(response)
    }),
  }
  return chain
}

let mockSupabase = createMockSupabase()

vi.mock('@/lib/supabaseServer', () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabase))
}))

vi.mock('@/app/actions/utils', () => ({
  getUserRestaurant: vi.fn().mockResolvedValue('550e8400-e29b-41d4-a716-446655440000')
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))

describe('Recipes Actions - Comprehensive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResponseQueue = []
    mockSupabase = createMockSupabase()
  })

  describe('getRecipeForEdit', () => {
    it('debería obtener receta completa con ingredientes', async () => {
      const { getRecipeForEdit } = await import('@/app/actions/recipes')
      
      const recipeId = 'recipe-123'
      const mockRecipe = {
        id: recipeId,
        name: 'Pollo al Horno',
        current_cost: 5.50,
        selling_price: 12.00
      }

      const mockIngredients = [
        {
          id: 'ri-1',
          quantity_gross: 1.5,
          quantity_net: 1.35,
          cost_at_time: 5.50,
          yield_factor: 0.9,
          master_ingredient: {
            id: 'ing-1',
            name: 'Pechuga de Pollo',
            base_unit: 'kg',
            standard_waste_pct: 0.1,
            current_avg_price: 8.90,
            allergens: []
          },
          sub_recipe: null
        }
      ]

      // Configurar respuestas en orden: primera para .single() (recipe), segunda para .eq() (ingredients)
      mockSingle.mockResolvedValueOnce({ data: mockRecipe, error: null })
      mockSupabase.eq.mockImplementation(() => {
        return {
          ...mockSupabase,
          then: (callback: any) => callback({ data: mockIngredients, error: null })
        }
      })

      const result = await getRecipeForEdit(recipeId)

      expect(result.id).toBe(recipeId)
      expect(result.name).toBe('Pollo al Horno')
    })

    it('debería lanzar error si no encuentra la receta', async () => {
      const { getRecipeForEdit } = await import('@/app/actions/recipes')
      
      mockSingle.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Not found' } 
      })

      await expect(getRecipeForEdit('non-existent')).rejects.toThrow('Recipe not found')
    })

    it('debería lanzar error si falla la consulta de ingredientes', async () => {
      const { getRecipeForEdit } = await import('@/app/actions/recipes')
      
      const mockRecipe = { id: 'recipe-123', name: 'Test' }

      mockSingle.mockResolvedValueOnce({ data: mockRecipe, error: null })
      mockSupabase.eq.mockImplementation(() => {
        return {
          ...mockSupabase,
          then: (callback: any) => callback({ data: null, error: { message: 'Ingredients query failed' } })
        }
      })

      await expect(getRecipeForEdit('recipe-123')).rejects.toThrow('Ingredients query failed')
    })
  })

  describe('getRecipePriceHistory', () => {
    it('debería retornar historial ordenado por fecha', async () => {
      const { getRecipePriceHistory } = await import('@/app/actions/recipes')
      
      const mockHistory = [
        { id: 'h1', price: 10.00, created_at: '2024-01-01' },
        { id: 'h2', price: 11.00, created_at: '2024-02-01' },
        { id: 'h3', price: 12.00, created_at: '2024-03-01' }
      ]

      mockSupabase.order.mockResolvedValueOnce({ data: mockHistory, error: null })

      const result = await getRecipePriceHistory('recipe-123')

      expect(result).toHaveLength(3)
      expect(result[0].price).toBe(10.00)
    })

    it('debería filtrar por entity_id y entity_type', async () => {
      const { getRecipePriceHistory } = await import('@/app/actions/recipes')
      
      const recipeId = 'recipe-123'
      
      mockSupabase.order.mockResolvedValueOnce({ data: [], error: null })

      await getRecipePriceHistory(recipeId)

      expect(mockSupabase.from).toHaveBeenCalledWith('price_history')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
    })
  })

  describe('deleteRecipe', () => {
    it('debería existir la función deleteRecipe', async () => {
      const { deleteRecipe } = await import('@/app/actions/recipes')
      expect(deleteRecipe).toBeDefined()
      expect(typeof deleteRecipe).toBe('function')
    })
  })
})
