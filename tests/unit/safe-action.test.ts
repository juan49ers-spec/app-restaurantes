/**
 * TESTS UNITARIOS: Safe Action
 *
 * Tests para el wrapper de acciones seguras con validación y manejo de errores
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'

// Mock de getUserRestaurant
const mockGetUserRestaurant = vi.fn()
vi.mock('@/app/actions/utils', () => ({
  getUserRestaurant: (...args: unknown[]) => mockGetUserRestaurant(...args)
}))

vi.mock('@/lib/verify-access', () => ({
  verifyRestaurantAccess: vi.fn().mockResolvedValue(undefined)
}))

describe('Safe Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('executeSafeAction', () => {
    it('debería ejecutar acción exitosamente con datos válidos', async () => {
      const { executeSafeAction } = await import('@/app/actions/safe-action')
      
      const schema = z.object({
        name: z.string(),
        quantity: z.number()
      })
      
      const mockHandler = vi.fn().mockResolvedValue({ id: '123', name: 'Test' })
      mockGetUserRestaurant.mockResolvedValue('550e8400-e29b-41d4-a716-446655440000')
      
      const result = await executeSafeAction(
        schema,
        { name: 'Test Item', quantity: 5 },
        mockHandler
      )
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ id: '123', name: 'Test' })
      expect(mockHandler).toHaveBeenCalledWith(
        { name: 'Test Item', quantity: 5 },
        '550e8400-e29b-41d4-a716-446655440000'
      )
    })

    it('debería retornar error de validación con datos inválidos', async () => {
      const { executeSafeAction } = await import('@/app/actions/safe-action')
      
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18)
      })
      
      const mockHandler = vi.fn()
      mockGetUserRestaurant.mockResolvedValue('550e8400-e29b-41d4-a716-446655440000')
      
      const result = await executeSafeAction(
        schema,
        { email: 'invalid-email', age: 15 },
        mockHandler
      )
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Validation Error')
      expect(result.error).toContain('email')
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('debería manejar error de autenticación', async () => {
      const { executeSafeAction } = await import('@/app/actions/safe-action')
      
      const schema = z.object({ name: z.string() })
      const mockHandler = vi.fn()
      mockGetUserRestaurant.mockRejectedValue(new Error('Access denied'))

      const result = await executeSafeAction(schema, { name: 'Test' }, mockHandler)

      expect(result.success).toBe(false)
      expect(result.error).toBe('No tienes permiso para esta operación')
    })

    it('debería manejar errores del handler', async () => {
      const { executeSafeAction } = await import('@/app/actions/safe-action')
      
      const schema = z.object({ name: z.string() })
      const mockHandler = vi.fn().mockRejectedValue(new Error('Database connection failed'))
      mockGetUserRestaurant.mockResolvedValue('550e8400-e29b-41d4-a716-446655440000')
      
      const result = await executeSafeAction(schema, { name: 'Test' }, mockHandler)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Ha ocurrido un error inesperado')
    })

    it('debería manejar errores no-Error', async () => {
      const { executeSafeAction } = await import('@/app/actions/safe-action')
      
      const schema = z.object({ name: z.string() })
      const mockHandler = vi.fn().mockRejectedValue('String error')
      mockGetUserRestaurant.mockResolvedValue('550e8400-e29b-41d4-a716-446655440000')
      
      const result = await executeSafeAction(schema, { name: 'Test' }, mockHandler)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Ha ocurrido un error inesperado')
    })

    it('debería formatear múltiples errores de validación', async () => {
      const { executeSafeAction } = await import('@/app/actions/safe-action')
      
      const schema = z.object({
        name: z.string().min(3),
        email: z.string().email(),
        age: z.number().int().positive()
      })
      
      mockGetUserRestaurant.mockResolvedValue('550e8400-e29b-41d4-a716-446655440000')
      
      const result = await executeSafeAction(
        schema,
        { name: 'ab', email: 'not-email', age: -5 },
        vi.fn()
      )
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('name')
      expect(result.error).toContain('email')
      expect(result.error).toContain('age')
    })

    it('debería manejar validación de arrays', async () => {
      const { executeSafeAction } = await import('@/app/actions/safe-action')
      
      const schema = z.array(z.string())
      const mockHandler = vi.fn().mockResolvedValue({ count: 3 })
      mockGetUserRestaurant.mockResolvedValue('550e8400-e29b-41d4-a716-446655440000')
      
      const result = await executeSafeAction(
        schema,
        ['item1', 'item2', 'item3'],
        mockHandler
      )
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ count: 3 })
    })

    it('debería manejar esquemas opcionales', async () => {
      const { executeSafeAction } = await import('@/app/actions/safe-action')
      
      const schema = z.object({
        name: z.string(),
        description: z.string().optional()
      })
      
      const mockHandler = vi.fn().mockResolvedValue({ created: true })
      mockGetUserRestaurant.mockResolvedValue('550e8400-e29b-41d4-a716-446655440000')
      
      const result = await executeSafeAction(
        schema,
        { name: 'Test' },
        mockHandler
      )
      
      expect(result.success).toBe(true)
    })
  })

  describe('safeAction factory', () => {
    it('debería crear una acción segura con contexto', async () => {
      const { safeAction } = await import('@/app/actions/safe-action')
      
      const schema = z.object({
        title: z.string(),
        content: z.string()
      })
      
      const handler = vi.fn().mockResolvedValue({ postId: '123' })
      mockGetUserRestaurant.mockResolvedValue('550e8400-e29b-41d4-a716-446655440000')
      
      const action = safeAction(schema, handler)
      
      const result = await action({
        title: 'My Post',
        content: 'Post content'
      })
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ postId: '123' })
      expect(handler).toHaveBeenCalledWith(
        { title: 'My Post', content: 'Post content' },
        { restaurant_id: '550e8400-e29b-41d4-a716-446655440000' }
      )
    })

    it('debería manejar errores en acción creada', async () => {
      const { safeAction } = await import('@/app/actions/safe-action')
      
      const schema = z.string()
      const handler = vi.fn().mockRejectedValue(new Error('Action failed'))
      mockGetUserRestaurant.mockResolvedValue('550e8400-e29b-41d4-a716-446655440000')
      
      const action = safeAction(schema, handler)
      const result = await action('test-data')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Ha ocurrido un error inesperado')
    })

    it('debería validar datos en acción creada', async () => {
      const { safeAction } = await import('@/app/actions/safe-action')
      
      const schema = z.number().positive()
      const handler = vi.fn()
      mockGetUserRestaurant.mockResolvedValue('550e8400-e29b-41d4-a716-446655440000')
      
      const action = safeAction(schema, handler)
      const result = await action(-5)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Validation Error')
    })

    it('debería soportar diferentes tipos de esquemas', async () => {
      const { safeAction } = await import('@/app/actions/safe-action')
      
      const stringSchema = z.string()
      const numberSchema = z.number()
      const booleanSchema = z.boolean()
      
      const stringHandler = vi.fn().mockResolvedValue('string-result')
      const numberHandler = vi.fn().mockResolvedValue(42)
      const booleanHandler = vi.fn().mockResolvedValue(true)
      
      mockGetUserRestaurant.mockResolvedValue('550e8400-e29b-41d4-a716-446655440000')
      
      const stringAction = safeAction(stringSchema, stringHandler)
      const numberAction = safeAction(numberSchema, numberHandler)
      const booleanAction = safeAction(booleanSchema, booleanHandler)
      
      const stringResult = await stringAction('hello')
      const numberResult = await numberAction(42)
      const booleanResult = await booleanAction(true)
      
      expect(stringResult.success).toBe(true)
      expect(numberResult.success).toBe(true)
      expect(booleanResult.success).toBe(true)
    })
  })
})
