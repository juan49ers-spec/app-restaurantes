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

const mockCookieGet = vi.fn()
const mockCookieDelete = vi.fn()
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: mockCookieGet,
    delete: mockCookieDelete,
  })),
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
    mockCookieGet.mockReturnValue(undefined)
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

    it('debería ignorar metadata restaurant_id si no es string', async () => {
      const { getUserRestaurant } = await import('@/app/actions/utils')

      mockSupabaseChain.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            user_metadata: {
              restaurant_id: { value: 'not-a-string' },
            },
          },
        },
        error: null,
      })
      mockSupabaseChain.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      await expect(getUserRestaurant()).resolves.toBeNull()
    })

    it('debería limpiar la cookie de cliente activo cuando la relación ya no es válida', async () => {
      const { getUserRestaurant } = await import('@/app/actions/utils')

      const mockUser = { id: 'consultant-1', email: 'consultant@example.com' }
      mockCookieGet.mockImplementation((name: string) =>
        name === 'active_consultant_restaurant_id'
          ? { value: 'client-restaurant-1' }
          : undefined
      )
      mockSupabaseChain.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      mockSupabaseChain.maybeSingle
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: { id: 'owned-restaurant-1' }, error: null })

      const result = await getUserRestaurant()

      expect(result).toBe('owned-restaurant-1')
      expect(mockSupabaseChain.from).toHaveBeenCalledWith('consultant_restaurants')
      expect(mockCookieDelete).toHaveBeenCalledWith('active_consultant_restaurant_id')
    })

    it('debería mantener la cookie cuando la relación de consultor sigue activa', async () => {
      const { getUserRestaurant } = await import('@/app/actions/utils')

      mockCookieGet.mockImplementation((name: string) =>
        name === 'active_consultant_restaurant_id'
          ? { value: 'client-restaurant-1' }
          : undefined
      )
      mockSupabaseChain.auth.getUser.mockResolvedValue({
        data: { user: { id: 'consultant-1', email: 'consultant@example.com' } },
        error: null,
      })
      mockSupabaseChain.maybeSingle.mockResolvedValueOnce({
        data: { restaurant_id: 'client-restaurant-1' },
        error: null,
      })

      const result = await getUserRestaurant()

      expect(result).toBe('client-restaurant-1')
      expect(mockCookieDelete).not.toHaveBeenCalled()
    })
  })
})
