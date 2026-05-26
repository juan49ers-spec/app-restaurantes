/**
 * TESTS UNITARIOS: Utils (Actions)
 *
 * Tests para utilidades de acciones del servidor
 * Incluye: getUserRestaurant, manejo de autenticación
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock de next/navigation - redirect lanza un error especial en Next.js
const mockRedirect = vi.fn().mockImplementation((url: string) => {
  const error: any = new Error(`NEXT_REDIRECT to ${url}`)
  error.digest = `NEXT_REDIRECT;replace;${url};`
  throw error
})
vi.mock('next/navigation', () => ({
  redirect: (url: string) => mockRedirect(url)
}))

// Mock de createClient
const mockSupabaseChain = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn()
}

vi.mock('@/lib/supabaseServer', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabaseChain)
}))

describe('Utils Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUserRestaurant', () => {
    it('debería retornar restaurant_id desde la base de datos', async () => {
      const { getUserRestaurant } = await import('@/app/actions/utils')
      
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      }
      
      const mockRestaurant = {
        id: '550e8400-e29b-41d4-a716-446655440000'
      }
      
      mockSupabaseChain.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      
      mockSupabaseChain.maybeSingle.mockResolvedValue({
        data: mockRestaurant,
        error: null
      })
      
      const result = await getUserRestaurant()
      
      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(mockSupabaseChain.from).toHaveBeenCalledWith('restaurants')
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('owner_id', 'user-123')
    })

    it('debería redirigir a login si no hay usuario', async () => {
      const { getUserRestaurant } = await import('@/app/actions/utils')
      
      mockSupabaseChain.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })
      
      // El redirect lanza un error que Next.js maneja internamente
      await expect(getUserRestaurant()).rejects.toThrow(/NEXT_REDIRECT/)
      expect(mockRedirect).toHaveBeenCalledWith('/login')
    })

    it('debería redirigir a login si hay error de autenticación', async () => {
      const { getUserRestaurant } = await import('@/app/actions/utils')
      
      mockSupabaseChain.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Session expired' }
      })
      
      await expect(getUserRestaurant()).rejects.toThrow(/NEXT_REDIRECT/)
      expect(mockRedirect).toHaveBeenCalledWith('/login')
    })

    it('debería retornar null si no existe restaurante para el usuario', async () => {
      const { getUserRestaurant } = await import('@/app/actions/utils')
      
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      }
      
      mockSupabaseChain.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      
      mockSupabaseChain.maybeSingle.mockResolvedValue({
        data: null,
        error: null
      })
      
      await expect(getUserRestaurant()).resolves.toBeNull()
    })

    it('debería manejar usuarios con diferentes IDs', async () => {
      const { getUserRestaurant } = await import('@/app/actions/utils')
      
      const mockUser = {
        id: 'different-user-id',
        email: 'different@example.com'
      }
      
      const mockRestaurant = {
        id: 'restaurant-abc-123'
      }
      
      mockSupabaseChain.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      
      mockSupabaseChain.maybeSingle.mockResolvedValue({
        data: mockRestaurant,
        error: null
      })
      
      const result = await getUserRestaurant()
      
      expect(result).toBe('restaurant-abc-123')
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('owner_id', 'different-user-id')
    })

    it('debería consultar solo el primer restaurante encontrado', async () => {
      const { getUserRestaurant } = await import('@/app/actions/utils')
      
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      mockSupabaseChain.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      
      mockSupabaseChain.maybeSingle.mockResolvedValue({
        data: { id: 'first-restaurant' },
        error: null
      })
      
      await getUserRestaurant()
      
      expect(mockSupabaseChain.limit).toHaveBeenCalledWith(1)
    })

    it('debería seleccionar solo el campo id del restaurante', async () => {
      const { getUserRestaurant } = await import('@/app/actions/utils')
      
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      
      mockSupabaseChain.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      
      mockSupabaseChain.maybeSingle.mockResolvedValue({
        data: { id: 'rest-123' },
        error: null
      })
      
      await getUserRestaurant()
      
      expect(mockSupabaseChain.select).toHaveBeenCalledWith('id')
    })

    it('debería manejar usuarios con metadata (comentado en código)', async () => {
      const { getUserRestaurant } = await import('@/app/actions/utils')
      
      // Aunque el código tiene comentado el uso de metadata,
      // verificamos que aún consulta la base de datos
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {
          restaurant_id: 'metadata-restaurant-id'
        }
      }
      
      mockSupabaseChain.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      
      mockSupabaseChain.maybeSingle.mockResolvedValue({
        data: { id: 'db-restaurant-id' },
        error: null
      })
      
      const result = await getUserRestaurant()
      
      // Como el código de metadata está comentado, debe retornar el de la DB
      expect(result).toBe('db-restaurant-id')
      expect(mockSupabaseChain.from).toHaveBeenCalledWith('restaurants')
    })
  })
})
