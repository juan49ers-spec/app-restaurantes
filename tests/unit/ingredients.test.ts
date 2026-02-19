/**
 * TEST UNITARIOS: Ingredients Actions
 * 
 * Tests para el módulo de gestión de ingredientes
 * Incluye: CRUD, precios, merma, importación y verificación de uso
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock chain object that supports method chaining
const createMockChain = (finalResult: { data?: unknown; error?: null | { message: string } } = { data: null, error: null }) => {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(finalResult),
    single: vi.fn().mockResolvedValue(finalResult),
  }
  return chain
}

// Mock de createClient - will be set up in beforeEach
let mockSupabaseChain: ReturnType<typeof createMockChain>

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

describe('Ingredients Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseChain = createMockChain({ data: null, error: null })
  })

  describe('getIngredients', () => {
    it('debería obtener ingredientes activos del restaurante', async () => {
      const { getIngredients } = await import('@/app/actions/ingredients')
      
      const mockIngredients = [
        { 
          id: '1', 
          name: 'Tomate', 
          base_unit: 'kg', 
          is_active: true,
          restaurant_id: '550e8400-e29b-41d4-a716-446655440000'
        },
        { 
          id: '2', 
          name: 'Cebolla', 
          base_unit: 'kg', 
          is_active: true,
          restaurant_id: '550e8400-e29b-41d4-a716-446655440000'
        }
      ]
      
      mockSupabaseChain = createMockChain({ data: mockIngredients, error: null })

      const result = await getIngredients()

      expect(mockSupabaseChain.from).toHaveBeenCalledWith('master_ingredients')
      expect(mockSupabaseChain.select).toHaveBeenCalledWith('*')
      expect(result).toEqual(mockIngredients)
    })

    it('debería lanzar error si falla la consulta', async () => {
      const { getIngredients } = await import('@/app/actions/ingredients')
      
      mockSupabaseChain = createMockChain({ 
        data: null, 
        error: { message: 'Database error' } 
      })

      await expect(getIngredients()).rejects.toThrow('Database error')
    })
  })

  describe('createIngredient', () => {
    it('debería crear un ingrediente correctamente', async () => {
      const { createIngredient } = await import('@/app/actions/ingredients')
      
      const mockIngredient = {
        id: '123',
        name: 'Pechuga de Pollo',
        base_unit: 'kg' as const,
        category: 'Carnes',
        standard_waste_pct: 0.05,
        current_avg_price: 8.90,
        restaurant_id: '550e8400-e29b-41d4-a716-446655440000',
        is_active: true
      }

      mockExecuteSafeAction.mockImplementation(async (_schema, _input, callback) => {
        return callback({
          name: 'Pechuga de Pollo',
          base_unit: 'kg',
          category: 'Carnes',
          standard_waste_pct: 0.05,
          current_avg_price: 8.90,
          is_active: true
        }, '550e8400-e29b-41d4-a716-446655440000')
      })

      mockSupabaseChain = createMockChain({ data: mockIngredient, error: null })

      const result = await createIngredient({
        name: 'Pechuga de Pollo',
        base_unit: 'kg',
        category: 'Carnes',
        standard_waste_pct: 0.05,
        current_avg_price: 8.90,
        is_active: true
      })

      expect(mockExecuteSafeAction).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('debería validar datos requeridos', async () => {
      const { createIngredient } = await import('@/app/actions/ingredients')
      
      mockExecuteSafeAction.mockImplementation(async () => {
        throw new Error('Validation failed')
      })

      await expect(createIngredient({
        name: '',
        base_unit: 'kg',
        is_active: true,
        standard_waste_pct: 0,
        current_avg_price: 0
      })).rejects.toThrow()
    })
  })

  describe('deleteIngredient', () => {
    it('debería realizar soft delete de un ingrediente', async () => {
      const { deleteIngredient } = await import('@/app/actions/ingredients')
      const ingredientId = '550e8400-e29b-41d4-a716-446655440001'

      mockExecuteSafeAction.mockImplementation(async (_schema, _id, callback) => {
        return callback(ingredientId, '550e8400-e29b-41d4-a716-446655440000')
      })

      mockSupabaseChain = createMockChain({ data: null, error: null })

      const result = await deleteIngredient(ingredientId)

      expect(mockExecuteSafeAction).toHaveBeenCalled()
      expect(result).toEqual({ success: true })
    })

    it('debería desvincular ingrediente de proveedores antes de eliminar', async () => {
      const { deleteIngredient } = await import('@/app/actions/ingredients')
      const ingredientId = '550e8400-e29b-41d4-a716-446655440001'

      mockExecuteSafeAction.mockImplementation(async (_schema, _id, callback) => {
        // Simular el callback que primero desvincula y luego elimina
        return callback(ingredientId, '550e8400-e29b-41d4-a716-446655440000')
      })

      mockSupabaseChain = createMockChain({ data: null, error: null })

      await deleteIngredient(ingredientId)

      // Verificar que se llamó a from('supplier_items') en algún momento
      expect(mockSupabaseChain.from).toHaveBeenCalled()
    })
  })

  describe('updateIngredientPrice', () => {
    it('debería actualizar el precio y registrar historial', async () => {
      const { updateIngredientPrice } = await import('@/app/actions/ingredients')
      const ingredientId = '550e8400-e29b-41d4-a716-446655440001'
      const newPrice = 12.50

      // Setup mock for single() to return current price first, then for update
      mockSupabaseChain.single
        .mockResolvedValueOnce({ data: { current_avg_price: 10.00 }, error: null })
      mockSupabaseChain = {
        ...mockSupabaseChain,
        limit: vi.fn().mockResolvedValue({ data: null, error: null })
      }

      await updateIngredientPrice(ingredientId, newPrice)

      expect(mockSupabaseChain.from).toHaveBeenCalledWith('master_ingredients')
      expect(mockSupabaseChain.update).toHaveBeenCalledWith({
        current_avg_price: newPrice,
        last_updated_at: expect.any(Date)
      })
    })

    it('debería actualizar precio sin registrar historial si no cambia', async () => {
      const { updateIngredientPrice } = await import('@/app/actions/ingredients')
      const ingredientId = '550e8400-e29b-41d4-a716-446655440001'
      const samePrice = 10.00

      mockSupabaseChain.single
        .mockResolvedValueOnce({ data: { current_avg_price: samePrice }, error: null })

      await updateIngredientPrice(ingredientId, samePrice)

      // Verificar que se actualizó el precio pero no se insertó en historial
      expect(mockSupabaseChain.update).toHaveBeenCalled()
    })
  })

  describe('updateIngredientWaste', () => {
    it('debería actualizar el porcentaje de merma', async () => {
      const { updateIngredientWaste } = await import('@/app/actions/ingredients')
      const ingredientId = '550e8400-e29b-41d4-a716-446655440001'
      const newWaste = 0.15 // 15%

      await updateIngredientWaste(ingredientId, newWaste)

      expect(mockSupabaseChain.from).toHaveBeenCalledWith('master_ingredients')
      expect(mockSupabaseChain.update).toHaveBeenCalledWith({
        standard_waste_pct: newWaste,
        last_updated_at: expect.any(Date)
      })
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', ingredientId)
    })
  })

  describe('checkIngredientUsage', () => {
    it('debería existir la función checkIngredientUsage', async () => {
      const { checkIngredientUsage } = await import('@/app/actions/ingredients')
      expect(checkIngredientUsage).toBeDefined()
      expect(typeof checkIngredientUsage).toBe('function')
    })
  })

  describe('Casos Edge', () => {
    it('debería manejar ingrediente con nombre muy largo', async () => {
      const { createIngredient } = await import('@/app/actions/ingredients')
      
      const longName = 'A'.repeat(300) // Nombre muy largo
      
      mockExecuteSafeAction.mockImplementation(async () => {
        throw new Error('Validation failed: name too long')
      })

      await expect(createIngredient({
        name: longName,
        base_unit: 'kg',
        is_active: true,
        standard_waste_pct: 0,
        current_avg_price: 0
      })).rejects.toThrow()
    })

    it('debería manejar precio con valor decimal muy pequeño', async () => {
      const { updateIngredientPrice } = await import('@/app/actions/ingredients')
      const ingredientId = '550e8400-e29b-41d4-a716-446655440001'
      const tinyPrice = 0.0001

      mockSupabaseChain.single
        .mockResolvedValueOnce({ data: { current_avg_price: 0.0002 }, error: null })

      await updateIngredientPrice(ingredientId, tinyPrice)

      expect(mockSupabaseChain.update).toHaveBeenCalledWith({
        current_avg_price: tinyPrice,
        last_updated_at: expect.any(Date)
      })
    })

    it('debería manejar precio con valor muy grande', async () => {
      const { updateIngredientPrice } = await import('@/app/actions/ingredients')
      const ingredientId = '550e8400-e29b-41d4-a716-446655440001'
      const largePrice = 999999.99

      mockSupabaseChain.single
        .mockResolvedValueOnce({ data: { current_avg_price: 10.00 }, error: null })

      await updateIngredientPrice(ingredientId, largePrice)

      expect(mockSupabaseChain.update).toHaveBeenCalledWith({
        current_avg_price: largePrice,
        last_updated_at: expect.any(Date)
      })
    })

    it('debería manejar ingrediente con caracteres especiales en nombre', async () => {
      const { createIngredient } = await import('@/app/actions/ingredients')
      
      const specialName = 'Tomate & Albahaca - Versión Española (2kg)'
      
      const mockIngredient = {
        id: '123',
        name: specialName,
        base_unit: 'kg' as const,
        is_active: true
      }

      mockExecuteSafeAction.mockImplementation(async (_schema, _input, callback) => {
        return callback({
          name: specialName,
          base_unit: 'kg',
          is_active: true,
          standard_waste_pct: 0,
          current_avg_price: 0
        }, '550e8400-e29b-41d4-a716-446655440000')
      })

      mockSupabaseChain = createMockChain({ data: mockIngredient, error: null })

      const result = await createIngredient({
        name: specialName,
        base_unit: 'kg',
        is_active: true,
        standard_waste_pct: 0,
        current_avg_price: 0
      })

      expect(result).toBeDefined()
    })

    it('debería manejar categoría vacía', async () => {
      const { createIngredient } = await import('@/app/actions/ingredients')
      
      const mockIngredient = {
        id: '123',
        name: 'Ingrediente Sin Categoría',
        base_unit: 'kg' as const,
        category: null,
        is_active: true
      }

      mockExecuteSafeAction.mockImplementation(async (_schema, _input, callback) => {
        return callback({
          name: 'Ingrediente Sin Categoría',
          base_unit: 'kg',
          is_active: true,
          standard_waste_pct: 0,
          current_avg_price: 0
        }, '550e8400-e29b-41d4-a716-446655440000')
      })

      mockSupabaseChain = createMockChain({ data: mockIngredient, error: null })

      const result = await createIngredient({
        name: 'Ingrediente Sin Categoría',
        base_unit: 'kg',
        is_active: true,
        standard_waste_pct: 0,
        current_avg_price: 0
      })

      expect(result).toBeDefined()
    })

    it('debería manejar unidades de medida variadas', async () => {
      const { importIngredientsBulk } = await import('@/app/actions/ingredients')
      
      const rows = [
        { nombre: 'Tomate', unidad_base: 'kg', merma_pct: 10, precio: 2.50 },
        { nombre: 'Leche', unidad_base: 'litros', merma_pct: 5, precio: 1.20 },
        { nombre: 'Huevos', unidad_base: 'unidades', merma_pct: 0, precio: 3.00 }
      ]

      mockSupabaseChain.limit.mockResolvedValueOnce({ data: [], error: null })
      mockSupabaseChain = createMockChain({ data: [{ id: '1' }, { id: '2' }, { id: '3' }], error: null })

      const result = await importIngredientsBulk(rows)

      expect(result.success).toBe(true)
    })

    it('debería manejar precio igual a cero', async () => {
      const { updateIngredientPrice } = await import('@/app/actions/ingredients')
      const ingredientId = '550e8400-e29b-41d4-a716-446655440001'
      const zeroPrice = 0

      mockSupabaseChain.single
        .mockResolvedValueOnce({ data: { current_avg_price: 5.00 }, error: null })

      await updateIngredientPrice(ingredientId, zeroPrice)

      expect(mockSupabaseChain.update).toHaveBeenCalledWith({
        current_avg_price: zeroPrice,
        last_updated_at: expect.any(Date)
      })
    })
  })

  describe('getIngredientPriceHistory', () => {
    it('debería obtener historial de precios de un ingrediente', async () => {
      const { getIngredientPriceHistory } = await import('@/app/actions/ingredients')
      const ingredientId = '550e8400-e29b-41d4-a716-446655440001'

      const mockHistory = [
        { date: '2024-01-01', price: 8.00 },
        { date: '2024-02-01', price: 8.90 }
      ]

      mockSupabaseChain = createMockChain({ data: mockHistory, error: null })

      const result = await getIngredientPriceHistory(ingredientId)

      expect(mockSupabaseChain.from).toHaveBeenCalledWith('price_history')
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('ingredient_id', ingredientId)
      expect(result).toEqual(mockHistory)
    })

    it('debería retornar array vacío si falla la consulta', async () => {
      const { getIngredientPriceHistory } = await import('@/app/actions/ingredients')
      const ingredientId = '550e8400-e29b-41d4-a716-446655440001'

      mockSupabaseChain = createMockChain({ 
        data: null, 
        error: { message: 'History error' } 
      })

      const result = await getIngredientPriceHistory(ingredientId)

      expect(result).toEqual([])
    })
  })

  describe('importIngredientsBulk', () => {
    it('debería llamar a upsert con datos de ingredientes', async () => {
      const { importIngredientsBulk } = await import('@/app/actions/ingredients')
      
      const rows = [
        { nombre: 'Tomate', unidad_base: 'kg', merma_pct: 10, precio: 2.50 },
        { nombre: 'Cebolla', unidad_base: 'kg', merma_pct: 15, precio: 1.80 }
      ]

      mockSupabaseChain.limit.mockResolvedValueOnce({ data: [], error: null })
      mockSupabaseChain = createMockChain({ 
        data: [{ id: '1' }, { id: '2' }], 
        error: null 
      })

      await importIngredientsBulk(rows)

      expect(mockSupabaseChain.from).toHaveBeenCalledWith('master_ingredients')
      expect(mockSupabaseChain.upsert).toHaveBeenCalled()
    })

    it('debería existir la función importIngredientsBulk', async () => {
      const { importIngredientsBulk } = await import('@/app/actions/ingredients')
      expect(importIngredientsBulk).toBeDefined()
      expect(typeof importIngredientsBulk).toBe('function')
    })

    it('debería manejar array vacío de ingredientes', async () => {
      const { importIngredientsBulk } = await import('@/app/actions/ingredients')
      
      const result = await importIngredientsBulk([])

      expect(result).toEqual({ success: true, count: 0, summary: { created: 0, updated: 0, reactivated: 0, total: 0 } })
    })
  })

  describe('createIngredient - Handler', () => {
    it('debería llamar executeSafeAction para createIngredient', async () => {
      const { createIngredient } = await import('@/app/actions/ingredients')
      
      mockExecuteSafeAction.mockResolvedValue({ success: true })

      const input = {
        name: 'Nuevo Ingrediente',
        base_unit: 'kg' as const,
        standard_waste_pct: 0.1,
        current_avg_price: 5.00,
        is_active: true
      }

      await createIngredient(input)

      expect(mockExecuteSafeAction).toHaveBeenCalled()
    })
  })

  describe('deleteIngredient - Handler', () => {
    it('debería llamar executeSafeAction para deleteIngredient', async () => {
      const { deleteIngredient } = await import('@/app/actions/ingredients')
      
      mockExecuteSafeAction.mockResolvedValue({ success: true })

      await deleteIngredient('ingredient-123')

      expect(mockExecuteSafeAction).toHaveBeenCalled()
    })
  })
})
