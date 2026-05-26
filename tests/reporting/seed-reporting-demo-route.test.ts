import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockSeedProfessionalReportDemoData = vi.fn()

vi.mock('@/lib/supabaseServer', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}))

vi.mock('@/app/actions/seed-professional-report-demo', () => ({
  seedProfessionalReportDemoData: (...args: unknown[]) => mockSeedProfessionalReportDemoData(...args),
}))

async function importRoute() {
  return import('@/app/api/seed-reporting-demo/route')
}

function request(ip = '203.0.113.10') {
  return new Request('http://localhost/api/seed-reporting-demo', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
  })
}

describe('/api/seed-reporting-demo', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.stubEnv('NODE_ENV', 'test')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSeedProfessionalReportDemoData.mockResolvedValue({
      success: true,
      data: { period: { from: '2026-02-01', to: '2026-02-28' }, rows: {} },
    })
  })

  it('returns 401 and does not seed when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const { POST } = await importRoute()

    const response = await POST(request())

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'No autenticado.' })
    expect(mockSeedProfessionalReportDemoData).not.toHaveBeenCalled()
  })

  it('rate limits repeated demo seed calls for the same user and IP', async () => {
    const { POST } = await importRoute()

    await POST(request())
    await POST(request())
    await POST(request())
    await POST(request())
    await POST(request())
    const response = await POST(request())

    expect(response.status).toBe(429)
    expect(await response.json()).toEqual({ error: 'Demasiadas ejecuciones de seed demo. Intenta de nuevo en unos minutos.' })
    expect(mockSeedProfessionalReportDemoData).toHaveBeenCalledTimes(5)
  })
})
