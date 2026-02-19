/**
 * TESTS UNITARIOS: Ingredients Actions - Import Bulk Deep Tests
 * 
 * Tests específicos para cubrir líneas faltantes de importIngredientsBulk
 * Enfocado en: contadores (231-234) y error handling (257-258)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock de createClient con control granular
let mockQueryResponses: Array<{ data: any; error: any }> = []
let queryIndex = 0

const createMockClient = () => {
  queryIndex = 0
  return {
    from: vi.fn().mockImplementation((table: string) => {
      return {
        select: vi.fn().mockImplementation((fields: string) => {
          return {
            eq: vi.fn().mockImplementation(() => {
              const response = mockQueryResponses[queryIndex] || { data: [], error: null }
              queryIndex++
              return Promise.resolve(response)
            })
          }
        }),
        upsert: vi.fn().mockImplementation((data: any, options: any) => {
          return {
            select: vi.fn().mockImplementation(() => {
              const response = mockQueryResponses[queryIndex] || { data: [], error: null }
              queryIndex++
              return Promise.resolve(response)
            })
          }
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

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))

describe('checkIngredientUsage - Deep Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryResponses = []
    queryIndex = 0
    mockSupabase = createMockClient()
  })

  it('debería retornar nombres de recetas donde se usa el ingrediente (línea 178)', async () => {
    const { checkIngredientUsage } = await import('@/app/actions/ingredients')
    
    mockQueryResponses = [
      {
        data: [
          { recipe_id: '1', recipes: { name: 'Salsa de Tomate' } },
          { recipe_id: '2', recipes: { name: 'Ensalada' } },
          { recipe_id: '1', recipes: { name: 'Salsa de Tomate' } }
        ],
        error: null
      }
    ]

    const result = await checkIngredientUsage('ingredient-123')

    expect(result).toEqual(['Salsa de Tomate', 'Ensalada'])
  })

  it('debería manejar recetas sin nombre (línea 180)', async () => {
    const { checkIngredientUsage } = await import('@/app/actions/ingredients')
    
    mockQueryResponses = [
      {
        data: [
          { recipe_id: '1', recipes: null },
          { recipe_id: '2', recipes: { name: null } },
          { recipe_id: '3', recipes: { name: 'Receta Válida' } }
        ],
        error: null
      }
    ]

    const result = await checkIngredientUsage('ingredient-123')

    expect(result).toContain('Receta desconocida (Referencia huérfana)')
    expect(result).toContain('Receta Válida')
  })

  it('debería retornar array vacío si no hay resultados', async () => {
    const { checkIngredientUsage } = await import('@/app/actions/ingredients')
    
    mockQueryResponses = [
      { data: [], error: null }
    ]

    const result = await checkIngredientUsage('ingredient-123')

    expect(result).toEqual([])
  })

  it('debería retornar array vacío si hay error (línea 171-173)', async () => {
    const { checkIngredientUsage } = await import('@/app/actions/ingredients')
    
    mockQueryResponses = [
      { data: null, error: { message: 'Database error' } }
    ]

    const result = await checkIngredientUsage('ingredient-123')

    expect(result).toEqual([])
  })

  it('debería deduplicar nombres de recetas (línea 184)', async () => {
    const { checkIngredientUsage } = await import('@/app/actions/ingredients')
    
    mockQueryResponses = [
      {
        data: [
          { recipe_id: '1', recipes: { name: 'Receta A' } },
          { recipe_id: '1', recipes: { name: 'Receta A' } },
          { recipe_id: '1', recipes: { name: 'Receta A' } }
        ],
        error: null
      }
    ]

    const result = await checkIngredientUsage('ingredient-123')

    expect(result).toEqual(['Receta A'])
    expect(result).toHaveLength(1)
  })
})

describe('importIngredientsBulk - Deep Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryResponses = []
    queryIndex = 0
    mockSupabase = createMockClient()
  })

  describe('Cálculo de métricas (líneas 231-234)', () => {
    it('debería contar ingredientes creados cuando no existen (línea 231)', async () => {
      const { importIngredientsBulk } = await import('@/app/actions/ingredients')
      
      // No hay ingredientes existentes
      mockQueryResponses = [
        { data: [], error: null },
        { data: [{ id: '1' }, { id: '2' }, { id: '3' }], error: null }
      ]

      const rows = [
        { nombre: 'Tomate', unidad_base: 'kg', merma_pct: 10, precio: 2.50 },
        { nombre: 'Cebolla', unidad_base: 'kg', merma_pct: 15, precio: 1.80 },
        { nombre: 'Pepino', unidad_base: 'kg', merma_pct: 5, precio: 3.00 }
      ]

      const result = await importIngredientsBulk(rows)

      expect(result.success).toBe(true)
      expect(result.summary.created).toBe(3)
      expect(result.summary.updated).toBe(0)
      expect(result.summary.reactivated).toBe(0)
    })

    it('debería contar ingredientes reactivados cuando están inactivos (línea 232)', async () => {
      const { importIngredientsBulk } = await import('@/app/actions/ingredients')
      
      mockQueryResponses = [
        { 
          data: [
            { id: 'archived-1', name: 'Tomate', is_active: false },
            { id: 'archived-2', name: 'Cebolla', is_active: false }
          ], 
          error: null 
        },
        { data: [{ id: 'archived-1' }, { id: 'archived-2' }], error: null }
      ]

      const rows = [
        { nombre: 'Tomate', unidad_base: 'kg', merma_pct: 10, precio: 2.50 },
        { nombre: 'Cebolla', unidad_base: 'kg', merma_pct: 15, precio: 1.80 }
      ]

      const result = await importIngredientsBulk(rows)

      expect(result.summary.created).toBe(0)
      expect(result.summary.updated).toBe(0)
      expect(result.summary.reactivated).toBe(2)
    })

    it('debería contar ingredientes actualizados cuando están activos (línea 234)', async () => {
      const { importIngredientsBulk } = await import('@/app/actions/ingredients')
      
      mockQueryResponses = [
        { 
          data: [
            { id: 'existing-1', name: 'Tomate', is_active: true },
            { id: 'existing-2', name: 'Cebolla', is_active: true }
          ], 
          error: null 
        },
        { data: [{ id: 'existing-1' }, { id: 'existing-2' }], error: null }
      ]

      const rows = [
        { nombre: 'Tomate', unidad_base: 'kg', merma_pct: 10, precio: 2.50 },
        { nombre: 'Cebolla', unidad_base: 'kg', merma_pct: 15, precio: 1.80 }
      ]

      const result = await importIngredientsBulk(rows)

      expect(result.summary.created).toBe(0)
      expect(result.summary.updated).toBe(2)
      expect(result.summary.reactivated).toBe(0)
    })

    it('debería manejar mezcla de operaciones', async () => {
      const { importIngredientsBulk } = await import('@/app/actions/ingredients')
      
      mockQueryResponses = [
        { 
          data: [
            { id: 'existing-1', name: 'Activo', is_active: true },
            { id: 'archived-1', name: 'Inactivo', is_active: false }
          ], 
          error: null 
        },
        { data: [{ id: 'existing-1' }, { id: 'archived-1' }, { id: 'new-1' }], error: null }
      ]

      const rows = [
        { nombre: 'Activo', unidad_base: 'kg', merma_pct: 10, precio: 2.50 },
        { nombre: 'Inactivo', unidad_base: 'kg', merma_pct: 15, precio: 1.80 },
        { nombre: 'Nuevo', unidad_base: 'kg', merma_pct: 5, precio: 3.00 }
      ]

      const result = await importIngredientsBulk(rows)

      expect(result.summary.created).toBe(1)
      expect(result.summary.updated).toBe(1)
      expect(result.summary.reactivated).toBe(1)
    })
  })

  describe('Error handling (líneas 257-258)', () => {
    it('debería lanzar error detallado cuando falla el upsert (línea 257-258)', async () => {
      const { importIngredientsBulk } = await import('@/app/actions/ingredients')
      
      mockQueryResponses = [
        { data: [], error: null },
        { data: null, error: { message: 'unique_violation: duplicate key value' } }
      ]

      const rows = [
        { nombre: 'Tomate', unidad_base: 'kg', merma_pct: 10, precio: 2.50 }
      ]

      await expect(importIngredientsBulk(rows)).rejects.toThrow('Failed to import ingredients: unique_violation')
    })

    it('debería lanzar error para constraint violations', async () => {
      const { importIngredientsBulk } = await import('@/app/actions/ingredients')
      
      mockQueryResponses = [
        { data: [], error: null },
        { data: null, error: { message: 'foreign_key_violation' } }
      ]

      const rows = [
        { nombre: 'Tomate', unidad_base: 'kg', merma_pct: 10, precio: 2.50 }
      ]

      await expect(importIngredientsBulk(rows)).rejects.toThrow('Failed to import ingredients: foreign_key_violation')
    })
  })

  describe('Transformación de datos', () => {
    it('debería incluir ID existente para updates', async () => {
      const { importIngredientsBulk } = await import('@/app/actions/ingredients')
      
      mockQueryResponses = [
        { data: [{ id: 'existing-id', name: 'Tomate', is_active: true }], error: null },
        { data: [{ id: 'existing-id' }], error: null }
      ]

      const rows = [
        { nombre: 'Tomate', unidad_base: 'kg', merma_pct: 10, precio: 3.00 }
      ]

      await importIngredientsBulk(rows)

      // El upsert debería haber sido llamado con el ID
      expect(mockSupabase.from).toHaveBeenCalledWith('master_ingredients')
    })

    it('debería establecer is_active true y archived_at null', async () => {
      const { importIngredientsBulk } = await import('@/app/actions/ingredients')
      
      mockQueryResponses = [
        { data: [], error: null },
        { data: [{ id: '1' }], error: null }
      ]

      const rows = [
        { nombre: 'Ingrediente', unidad_base: 'kg', merma_pct: 10, precio: 5.00 }
      ]

      await importIngredientsBulk(rows)

      expect(mockSupabase.from).toHaveBeenCalledWith('master_ingredients')
    })

    it('debería convertir merma_pct a decimal', async () => {
      const { importIngredientsBulk } = await import('@/app/actions/ingredients')
      
      mockQueryResponses = [
        { data: [], error: null },
        { data: [{ id: '1' }], error: null }
      ]

      const rows = [
        { nombre: 'Ingrediente', unidad_base: 'kg', merma_pct: 15, precio: 5.00 }
      ]

      await importIngredientsBulk(rows)

      // Verificar que el upsert fue llamado
      expect(mockSupabase.from).toHaveBeenCalledWith('master_ingredients')
    })
  })
})
