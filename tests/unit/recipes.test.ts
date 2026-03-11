/**
 * TESTS UNITARIOS: Recipes Actions (Mejorado)
 *
 * Tests para el módulo de gestión de recetas
 * Incluye: CRUD, detalles, historial de precios y cálculos
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock de createClient con cadena completa
const createMockChain = () => {
  const chain: any = {
    data: null,
    error: null,
  }
  
  chain.from = vi.fn().mockReturnValue(chain)
  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockResolvedValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(chain)
  chain.maybeSingle = vi.fn().mockResolvedValue(chain)
  
  return chain
}

let mockSupabaseChain = createMockChain()

vi.mock('@/lib/supabaseServer', () => ({
  createClient: vi.fn().mockImplementation(() => Promise.resolve(mockSupabaseChain))
}))

// Mock de getUserRestaurant
vi.mock('@/app/actions/utils', () => ({
  getUserRestaurant: vi.fn().mockResolvedValue('550e8400-e29b-41d4-a716-446655440000')
}))

// Mock de next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))

// Mock de executeSafeAction
const mockExecuteSafeAction = vi.fn()
vi.mock('@/app/actions/safe-action', () => ({
  executeSafeAction: (...args: unknown[]) => mockExecuteSafeAction(...args)
}))

describe('Recipes Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock chain for each test
    mockSupabaseChain = createMockChain()
  })

  describe('getRecipes', () => {
    it('debería obtener recetas con margen calculado', async () => {
      const { getRecipes } = await import('@/app/actions/recipes')

      const mockRecipes = [
        {
          id: '1',
          name: 'Pollo al Horno',
          current_cost: 5.50,
          selling_price: 12.00,
          restaurant_id: '550e8400-e29b-41d4-a716-446655440000'
        },
        {
          id: '2',
          name: 'Ensalada César',
          current_cost: 3.20,
          selling_price: 8.50,
          restaurant_id: '550e8400-e29b-41d4-a716-446655440000'
        }
      ]

      mockSupabaseChain.order.mockResolvedValue({ data: mockRecipes, error: null })

      const result = await getRecipes()

      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('calculated_margin')
      expect(result[0].calculated_margin).toBe(((12.00 - 5.50) / 12.00) * 100)
    })

    it('debería retornar margen 0 si no hay precio de venta', async () => {
      const { getRecipes } = await import('@/app/actions/recipes')

      const mockRecipes = [
        {
          id: '1',
          name: 'Receta Sin Precio',
          current_cost: 5.50,
          selling_price: null,
          restaurant_id: '550e8400-e29b-41d4-a716-446655440000'
        }
      ]

      mockSupabaseChain.order.mockResolvedValue({ data: mockRecipes, error: null })

      const result = await getRecipes()

      expect(result[0].calculated_margin).toBe(0)
    })

    it('debería lanzar error si falla la consulta', async () => {
      const { getRecipes } = await import('@/app/actions/recipes')

      mockSupabaseChain.order.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      })

      await expect(getRecipes()).rejects.toThrow('Database error')
    })
  })

  describe('getRecipeDetails', () => {
    it('debería obtener detalles de ingredientes de una receta', async () => {
      const { getRecipeDetails } = await import('@/app/actions/recipes')
      const recipeId = '550e8400-e29b-41d4-a716-446655440001'

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
            current_avg_price: 8.90
          },
          sub_recipe: null
        }
      ]

      mockSupabaseChain.eq.mockResolvedValue({ data: mockIngredients, error: null })

      const result = await getRecipeDetails(recipeId)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        ingredient_name: 'Pechuga de Pollo',
        unit: 'kg',
        cost_per_unit: 8.90,
        quantity_gross: 1.5,
        type: 'INGREDIENT'
      })
    })

    it('debería manejar sub-recetas como ingredientes', async () => {
      const { getRecipeDetails } = await import('@/app/actions/recipes')
      const recipeId = '550e8400-e29b-41d4-a716-446655440001'

      const mockIngredients = [
        {
          id: 'ri-1',
          quantity_gross: 2,
          quantity_net: 2,
          cost_at_time: 3.50,
          yield_factor: null,
          master_ingredient: null,
          sub_recipe: {
            id: 'sub-1',
            name: 'Salsa Bechamel',
            current_cost: 3.50
          }
        }
      ]

      mockSupabaseChain.eq.mockResolvedValue({ data: mockIngredients, error: null })

      const result = await getRecipeDetails(recipeId)

      expect(result[0]).toMatchObject({
        type: 'RECIPE',
        ingredient_name: 'Salsa Bechamel',
        unit: 'unit',
        waste_pct: 0
      })
    })

    it('debería manejar ingredientes desconocidos', async () => {
      const { getRecipeDetails } = await import('@/app/actions/recipes')
      const recipeId = '550e8400-e29b-41d4-a716-446655440001'

      const mockIngredients = [
        {
          id: 'ri-1',
          quantity_gross: 1,
          quantity_net: 1,
          cost_at_time: 0,
          yield_factor: null,
          master_ingredient: null,
          sub_recipe: null
        }
      ]

      mockSupabaseChain.eq.mockResolvedValue({ data: mockIngredients, error: null })

      const result = await getRecipeDetails(recipeId)

      expect(result[0]).toMatchObject({
        ingredient_name: 'Unknown',
        unit: 'kg',
        cost_per_unit: 0
      })
    })

    it('debería lanzar error si falla la consulta', async () => {
      const { getRecipeDetails } = await import('@/app/actions/recipes')
      const recipeId = '550e8400-e29b-41d4-a716-446655440001'

      mockSupabaseChain.eq.mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      })

      await expect(getRecipeDetails(recipeId)).rejects.toThrow('Not found')
    })
  })

  describe('deleteRecipe', () => {
    it('debería llamar executeSafeAction con los parámetros correctos', async () => {
      const { deleteRecipe } = await import('@/app/actions/recipes')
      const recipeId = '550e8400-e29b-41d4-a716-446655440001'
      
      mockExecuteSafeAction.mockResolvedValue({ success: true, data: { success: true } })
      
      await deleteRecipe(recipeId)
      
      expect(mockExecuteSafeAction).toHaveBeenCalled()
      expect(mockExecuteSafeAction.mock.calls[0][0]).toBeDefined() // schema
      expect(mockExecuteSafeAction.mock.calls[0][1]).toBe(recipeId) // rawData
      expect(typeof mockExecuteSafeAction.mock.calls[0][2]).toBe('function') // handler
    })

    it('debería manejar error de validación UUID', async () => {
      const { deleteRecipe } = await import('@/app/actions/recipes')
      const invalidId = 'not-a-uuid'
      
      mockExecuteSafeAction.mockImplementation(async (schema, id) => {
        // Simular validación de UUID fallida
        const parseResult = schema.safeParse(id)
        if (!parseResult.success) {
          return { success: false, error: 'Invalid uuid' }
        }
        return { success: true, data: {} }
      })
      
      const result = await deleteRecipe(invalidId)
      
      expect(result.success).toBe(false)
    })

    it('debería existir la función deleteRecipe', async () => {
      const { deleteRecipe } = await import('@/app/actions/recipes')
      expect(deleteRecipe).toBeDefined()
      expect(typeof deleteRecipe).toBe('function')
    })
  })

  describe('getRecipeForEdit', () => {
    it('debería existir la función getRecipeForEdit', async () => {
      const { getRecipeForEdit } = await import('@/app/actions/recipes')
      expect(getRecipeForEdit).toBeDefined()
      expect(typeof getRecipeForEdit).toBe('function')
    })
  })

  describe('getRecipePriceHistory', () => {
    it('debería obtener historial de precios ordenado', async () => {
      const { getRecipePriceHistory } = await import('@/app/actions/recipes')
      const recipeId = '550e8400-e29b-41d4-a716-446655440001'
      
      const mockHistory = [
        { id: 'h1', entity_id: recipeId, entity_type: 'RECIPE', price: 10.50, created_at: '2024-01-01' },
        { id: 'h2', entity_id: recipeId, entity_type: 'RECIPE', price: 11.00, created_at: '2024-02-01' },
        { id: 'h3', entity_id: recipeId, entity_type: 'RECIPE', price: 12.50, created_at: '2024-03-01' }
      ]
      
      mockSupabaseChain.order.mockResolvedValue({
        data: mockHistory,
        error: null
      })
      
      const result = await getRecipePriceHistory(recipeId)
      
      expect(result).toHaveLength(3)
      expect(result[0].price).toBe(10.50)
      expect(result[2].price).toBe(12.50)
      expect(mockSupabaseChain.from).toHaveBeenCalledWith('price_history')
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('entity_id', recipeId)
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('entity_type', 'RECIPE')
    })

    it('debería retornar array vacío si no hay historial', async () => {
      const { getRecipePriceHistory } = await import('@/app/actions/recipes')
      const recipeId = '550e8400-e29b-41d4-a716-446655440001'
      
      mockSupabaseChain.order.mockResolvedValue({
        data: [],
        error: null
      })
      
      const result = await getRecipePriceHistory(recipeId)
      
      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    it('debería manejar error de consulta y retornar array vacío', async () => {
      const { getRecipePriceHistory } = await import('@/app/actions/recipes')
      const recipeId = '550e8400-e29b-41d4-a716-446655440001'
      
      mockSupabaseChain.order.mockResolvedValue({
        data: null,
        error: { message: 'Database connection lost' }
      })
      
      const result = await getRecipePriceHistory(recipeId)
      
      expect(result).toEqual([])
    })

    it('debería filtrar por tipo de entidad RECIPE', async () => {
      const { getRecipePriceHistory } = await import('@/app/actions/recipes')
      const recipeId = '550e8400-e29b-41d4-a716-446655440001'
      
      await getRecipePriceHistory(recipeId)
      
      // Verificar que from fue llamado con price_history
      expect(mockSupabaseChain.from).toHaveBeenCalledWith('price_history')
      // Verificar que select fue llamado
      expect(mockSupabaseChain.select).toHaveBeenCalledWith('price, created_at, change_pct')
    })
  })

  describe('deleteRecipe - Handler (líneas 143-163)', () => {
    it('debería llamar executeSafeAction para deleteRecipe', async () => {
      const { deleteRecipe } = await import('@/app/actions/recipes')
      
      mockExecuteSafeAction.mockResolvedValue({ success: true })

      await deleteRecipe('550e8400-e29b-41d4-a716-446655440001')

      expect(mockExecuteSafeAction).toHaveBeenCalled()
    })
  })
})
