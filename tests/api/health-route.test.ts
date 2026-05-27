import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSelect = vi.fn()
const mockLimit = vi.fn()

vi.mock('@/lib/supabaseServer', () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  })),
}))

async function importRoute() {
  return import('@/app/api/health/route')
}

describe('/api/health', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockSelect.mockReturnValue({ limit: mockLimit })
    mockLimit.mockResolvedValue({ data: [{ id: 'restaurant-1' }], error: null })
  })

  it('returns healthy status without exposing secrets when database responds', async () => {
    const { GET } = await importRoute()

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.status).toBe('healthy')
    expect(json.checks.database.ok).toBe(true)
    expect(json).not.toHaveProperty('env')
    expect(JSON.stringify(json)).not.toContain('SUPABASE')
  })

  it('returns unhealthy status when database check fails', async () => {
    mockLimit.mockResolvedValue({ data: null, error: { message: 'connection refused' } })
    const { GET } = await importRoute()

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(503)
    expect(json.status).toBe('unhealthy')
    expect(json.checks.database.ok).toBe(false)
    expect(json.checks.database.message).toBe('Database check failed.')
  })
})
