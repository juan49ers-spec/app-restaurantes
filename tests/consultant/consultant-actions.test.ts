import { beforeEach, describe, expect, it, vi } from 'vitest'

type QueryError = { message: string; code?: string }
type QueryResult = { data: unknown; error: QueryError | null }
type Filter = ['eq' | 'not', string, unknown, unknown?]

const RESTAURANT_ID = '550e8400-e29b-41d4-a716-446655440000'
const REQUEST_ID = '33333333-3333-4333-8333-333333333333'
const REPORT_ID = '11111111-1111-4111-8111-111111111111'

let mockRestaurantId: string | null = RESTAURANT_ID
let tableResults: Record<string, QueryResult> = {}
let calls: Array<{
  table: string
  filters: Filter[]
  select?: string
  updateValue?: Record<string, unknown>
  orders: Array<{ column: string; ascending?: boolean }>
}> = []

class MockQuery {
  private filters: Filter[] = []
  private orders: Array<{ column: string; ascending?: boolean }> = []
  private selectValue?: string

  constructor(
    private readonly table: string,
    private readonly operation: 'select' | 'update' = 'select',
    private readonly mutationValue?: Record<string, unknown>,
  ) {}

  select(value?: string) {
    this.selectValue = value
    return this
  }

  update(value: Record<string, unknown>) {
    return new MockQuery(this.table, 'update', value)
  }

  eq(column: string, value: unknown) {
    this.filters.push(['eq', column, value])
    return this
  }

  not(column: string, operator: string, value: unknown) {
    this.filters.push(['not', column, operator, value])
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending })
    return this
  }

  maybeSingle() {
    return Promise.resolve(this.resolve())
  }

  single() {
    return Promise.resolve(this.resolve())
  }

  then(resolve: (value: QueryResult) => unknown, reject?: (reason?: unknown) => unknown) {
    return Promise.resolve(this.resolve()).then(resolve, reject)
  }

  private resolve(): QueryResult {
    calls.push({
      table: this.table,
      filters: this.filters,
      select: this.selectValue,
      updateValue: this.operation === 'update' ? this.mutationValue : undefined,
      orders: this.orders,
    })

    if (this.operation === 'update' && this.table === 'restaurants') {
      const ownsRestaurant = this.filters.some(filter => filter[0] === 'eq' && filter[1] === 'id' && filter[2] === RESTAURANT_ID)
      if (!ownsRestaurant) return { data: null, error: { message: 'not found' } }
      return {
        data: {
          id: RESTAURANT_ID,
          name: 'Casa Juan',
          consultant_name: this.mutationValue?.consultant_name,
          consultant_email: this.mutationValue?.consultant_email,
          consultant_logo_url: this.mutationValue?.consultant_logo_url,
        },
        error: null,
      }
    }

    if (this.operation === 'update' && this.table === 'portal_meeting_requests') {
      const ownsRestaurant = this.filters.some(filter => filter[0] === 'eq' && filter[1] === 'restaurant_id' && filter[2] === RESTAURANT_ID)
      if (!ownsRestaurant) return { data: null, error: { message: 'not found' } }
      return {
        data: {
          id: REQUEST_ID,
          status: this.mutationValue?.status,
        },
        error: null,
      }
    }

    return tableResults[this.table] ?? { data: [], error: null }
  }
}

const mockSupabase = {
  from: vi.fn((table: string) => new MockQuery(table)),
}

vi.mock('@/lib/supabaseServer', () => ({
  createClient: vi.fn(async () => mockSupabase),
}))

vi.mock('@/app/actions/utils', () => ({
  getUserRestaurant: vi.fn(async () => mockRestaurantId),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('consultant server actions', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockRestaurantId = RESTAURANT_ID
    calls = []
    tableResults = {
      restaurants: {
        data: {
          id: RESTAURANT_ID,
          name: 'Casa Juan',
          consultant_name: 'Zinergia',
          consultant_email: 'consultor@controlhub.es',
          consultant_logo_url: null,
        },
        error: null,
      },
      professional_report_drafts: {
        data: [{
          id: REPORT_ID,
          period_from: '2026-02-01',
          period_to: '2026-02-28',
          version: 1,
          status: 'READY',
          published_at: '2026-05-26T10:00:00.000Z',
        }],
        error: null,
      },
      portal_meeting_requests: {
        data: [{
          id: REQUEST_ID,
          report_id: REPORT_ID,
          message: 'Revisamos el informe.',
          status: 'PENDING',
          created_at: '2026-05-26T11:00:00.000Z',
        }],
        error: null,
      },
    }
  })

  it('loads consultant workspace scoped to the active restaurant', async () => {
    const { getConsultantWorkspace } = await import('@/app/actions/consultant')

    const result = await getConsultantWorkspace()

    expect(result.success).toBe(true)
    expect(result.data?.warnings).toEqual([])
    expect(result.data?.restaurant).toEqual(expect.objectContaining({
      id: RESTAURANT_ID,
      consultantName: 'Zinergia',
    }))
    expect(result.data?.meetingRequests[0].report?.id).toBe(REPORT_ID)
    expect(calls.find(call => call.table === 'restaurants')?.filters).toContainEqual(['eq', 'id', RESTAURANT_ID])
    expect(calls.find(call => call.table === 'professional_report_drafts')?.filters).toEqual(expect.arrayContaining([
      ['eq', 'restaurant_id', RESTAURANT_ID],
      ['not', 'published_at', 'is', null],
    ]))
    expect(calls.find(call => call.table === 'portal_meeting_requests')?.filters).toContainEqual(['eq', 'restaurant_id', RESTAURANT_ID])
  })

  it('returns a clean error when there is no active restaurant', async () => {
    mockRestaurantId = null
    const { getConsultantWorkspace } = await import('@/app/actions/consultant')

    const result = await getConsultantWorkspace()

    expect(result).toEqual({ success: false, error: 'No hay restaurante activo.' })
    expect(calls).toEqual([])
  })

  it('keeps the workspace usable when non-critical consultant queries fail', async () => {
    tableResults.professional_report_drafts = { data: null, error: { message: 'reports unavailable' } }
    tableResults.portal_meeting_requests = { data: null, error: { message: 'requests unavailable' } }
    const { getConsultantWorkspace } = await import('@/app/actions/consultant')

    const result = await getConsultantWorkspace()

    expect(result.success).toBe(true)
    expect(result.data?.restaurant.name).toBe('Casa Juan')
    expect(result.data?.publishedReports).toEqual([])
    expect(result.data?.meetingRequests).toEqual([])
    expect(result.data?.warnings).toEqual([
      'No se pudieron cargar los informes publicados.',
      'No se pudieron cargar las solicitudes de reunión.',
    ])
  })

  it('updates consultant branding for the active restaurant only', async () => {
    const { updateConsultantBranding } = await import('@/app/actions/consultant')

    const result = await updateConsultantBranding({
      consultantName: 'Zinergia Consultora',
      consultantEmail: 'hola@zinergia.es',
      consultantLogoUrl: '',
    })

    expect(result.success).toBe(true)
    const call = calls.find(item => item.table === 'restaurants' && item.updateValue)
    expect(call?.filters).toContainEqual(['eq', 'id', RESTAURANT_ID])
    expect(call?.updateValue).toEqual({
      consultant_name: 'Zinergia Consultora',
      consultant_email: 'hola@zinergia.es',
      consultant_logo_url: null,
    })
  })

  it('rejects invalid consultant branding input', async () => {
    const { updateConsultantBranding } = await import('@/app/actions/consultant')

    const result = await updateConsultantBranding({
      consultantName: 'Zinergia',
      consultantEmail: 'not-an-email',
      consultantLogoUrl: '',
    })

    expect(result).toEqual({ success: false, error: 'Datos de consultor inválidos.' })
    expect(calls.some(call => call.updateValue)).toBe(false)
  })

  it('updates meeting request status scoped to the active restaurant', async () => {
    const { updateMeetingRequestStatus } = await import('@/app/actions/consultant')

    const result = await updateMeetingRequestStatus({ id: REQUEST_ID, status: 'ACKNOWLEDGED' })

    expect(result).toEqual({ success: true, data: { id: REQUEST_ID, status: 'ACKNOWLEDGED' } })
    const call = calls.find(item => item.table === 'portal_meeting_requests' && item.updateValue)
    expect(call?.filters).toEqual(expect.arrayContaining([
      ['eq', 'id', REQUEST_ID],
      ['eq', 'restaurant_id', RESTAURANT_ID],
    ]))
  })
})
