import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreateServerClient = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient,
}))

async function importProxy() {
  return import('@/proxy')
}

describe('proxy public health route', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('allows /api/health without an auth cookie and without calling Supabase auth', async () => {
    const { proxy } = await importProxy()

    const response = await proxy(new NextRequest('https://controlhub.test/api/health'))

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
    expect(mockCreateServerClient).not.toHaveBeenCalled()
  })

  it('redirects private routes without an auth cookie to login', async () => {
    const { proxy } = await importProxy()

    const response = await proxy(new NextRequest('https://controlhub.test/consultant'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://controlhub.test/login')
    expect(mockCreateServerClient).not.toHaveBeenCalled()
  })
})
