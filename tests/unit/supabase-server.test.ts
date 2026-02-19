/**
 * TESTS UNITARIOS: Supabase Server Client
 * 
 * Tests para la configuración del cliente de Supabase en el servidor
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock de next/headers
const mockCookieStore = {
  getAll: vi.fn().mockReturnValue([]),
  set: vi.fn()
}

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore)
}))

// Mock de @supabase/ssr
const mockCreateServerClient = vi.fn()
vi.mock('@supabase/ssr', () => ({
  createServerClient: (...args: any[]) => mockCreateServerClient(...args)
}))

describe('Supabase Server Client', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock environment variables
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('createClient', () => {
    it('debería crear cliente con configuración correcta', async () => {
      const mockClient = { auth: {}, from: vi.fn() }
      mockCreateServerClient.mockReturnValue(mockClient)

      const { createClient } = await import('@/lib/supabaseServer')
      const client = await createClient()

      expect(mockCreateServerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function)
          })
        })
      )
      expect(client).toBe(mockClient)
    })

    it('debería llamar cookies() para obtener cookieStore', async () => {
      const { cookies } = await import('next/headers')
      mockCreateServerClient.mockReturnValue({})

      const { createClient } = await import('@/lib/supabaseServer')
      await createClient()

      expect(cookies).toHaveBeenCalled()
    })

    it('debería configurar getAll para retornar todas las cookies', async () => {
      const mockCookies = [
        { name: 'session', value: 'abc123' },
        { name: 'user', value: 'john' }
      ]
      mockCookieStore.getAll.mockReturnValue(mockCookies)
      
      let capturedConfig: any
      mockCreateServerClient.mockImplementation((url: string, key: string, config: any) => {
        capturedConfig = config
        return {}
      })

      const { createClient } = await import('@/lib/supabaseServer')
      await createClient()

      const result = capturedConfig.cookies.getAll()
      expect(result).toEqual(mockCookies)
      expect(mockCookieStore.getAll).toHaveBeenCalled()
    })

    it('debería configurar setAll para setear cookies', async () => {
      let capturedConfig: any
      mockCreateServerClient.mockImplementation((url: string, key: string, config: any) => {
        capturedConfig = config
        return {}
      })

      const { createClient } = await import('@/lib/supabaseServer')
      await createClient()

      const cookiesToSet = [
        { name: 'session', value: 'new-value', options: { httpOnly: true } },
        { name: 'refresh', value: 'refresh-token', options: { maxAge: 3600 } }
      ]

      capturedConfig.cookies.setAll(cookiesToSet)

      expect(mockCookieStore.set).toHaveBeenCalledTimes(2)
      expect(mockCookieStore.set).toHaveBeenCalledWith('session', 'new-value', { httpOnly: true })
      expect(mockCookieStore.set).toHaveBeenCalledWith('refresh', 'refresh-token', { maxAge: 3600 })
    })

    it('debería manejar errores en setAll sin lanzar excepciones', async () => {
      let capturedConfig: any
      mockCreateServerClient.mockImplementation((url: string, key: string, config: any) => {
        capturedConfig = config
        return {}
      })

      const { createClient } = await import('@/lib/supabaseServer')
      await createClient()

      // Simular error en set
      mockCookieStore.set.mockImplementation(() => {
        throw new Error('Cannot set cookie in Server Component')
      })

      const cookiesToSet = [
        { name: 'session', value: 'new-value', options: {} }
      ]

      // No debería lanzar error
      expect(() => capturedConfig.cookies.setAll(cookiesToSet)).not.toThrow()
    })

    it('debería manejar setAll vacío', async () => {
      let capturedConfig: any
      mockCreateServerClient.mockImplementation((url: string, key: string, config: any) => {
        capturedConfig = config
        return {}
      })

      const { createClient } = await import('@/lib/supabaseServer')
      await createClient()

      // No debería lanzar error con array vacío
      expect(() => capturedConfig.cookies.setAll([])).not.toThrow()
      expect(mockCookieStore.set).not.toHaveBeenCalled()
    })

    it('debería usar variables de entorno correctas', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://custom.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'custom-key'

      mockCreateServerClient.mockReturnValue({})

      // Limpiar caché del módulo
      vi.resetModules()

      const { createClient } = await import('@/lib/supabaseServer')
      await createClient()

      expect(mockCreateServerClient).toHaveBeenCalledWith(
        'https://custom.supabase.co',
        'custom-key',
        expect.any(Object)
      )
    })

    it('debería crear nuevo cookieStore en cada llamada', async () => {
      const { cookies } = await import('next/headers')
      mockCreateServerClient.mockReturnValue({})

      const { createClient } = await import('@/lib/supabaseServer')
      
      await createClient()
      await createClient()

      expect(cookies).toHaveBeenCalledTimes(2)
    })
  })
})
