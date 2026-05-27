import { beforeEach, describe, expect, it, vi } from 'vitest'

type QueryError = { message: string; code?: string }
type QueryResult = { data: unknown; error: QueryError | null; count?: number | null }
type Filter = ['eq' | 'neq' | 'not' | 'gte' | 'lte' | 'gt' | 'in', string, unknown, unknown?]

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
  countMode?: string
  head?: boolean
  limitValue?: number
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

  select(value?: string, options?: { count?: string; head?: boolean }) {
    this.selectValue = value
    this.countMode = options?.count
    this.head = options?.head
    return this
  }

  private countMode?: string
  private head?: boolean

  update(value: Record<string, unknown>) {
    return new MockQuery(this.table, 'update', value)
  }

  eq(column: string, value: unknown) {
    this.filters.push(['eq', column, value])
    return this
  }

  neq(column: string, value: unknown) {
    this.filters.push(['neq', column, value])
    return this
  }

  gt(column: string, value: unknown) {
    this.filters.push(['gt', column, value])
    return this
  }

  in(column: string, value: unknown[]) {
    this.filters.push(['in', column, value])
    return this
  }

  gte(column: string, value: unknown) {
    this.filters.push(['gte', column, value])
    return this
  }

  lte(column: string, value: unknown) {
    this.filters.push(['lte', column, value])
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

  limit(value: number) {
    this.limitValue = value
    return this
  }

  private limitValue?: number

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
      countMode: this.countMode,
      head: this.head,
      limitValue: this.limitValue,
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

    const result = tableResults[this.table] ?? { data: [], error: null }
    if (this.head) {
      return {
        data: null,
        error: result.error,
        count: result.count ?? (Array.isArray(result.data) ? result.data.length : result.data ? 1 : 0),
      }
    }
    return result
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
      daily_sales: { data: Array.from({ length: 10 }, (_, index) => ({ id: `sale-${index}` })), error: null },
      operating_expenses: { data: Array.from({ length: 5 }, (_, index) => ({ id: `expense-${index}` })), error: null },
      invoices: { data: [{ id: 'invoice-1' }], error: null },
      employees: { data: [{ id: 'employee-1' }], error: null },
      shifts: { data: [{ id: 'shift-1' }], error: null },
      recipes: { data: [{ id: 'recipe-1' }], error: null },
      daily_recipe_sales: { data: [{ id: 'recipe-sale-1' }], error: null },
      menu_reports: { data: [], error: null },
    }
  })

  it('loads consultant workspace scoped to the active restaurant', async () => {
    const { getConsultantWorkspace } = await import('@/app/actions/consultant')

    const result = await getConsultantWorkspace()

    expect(result.success).toBe(true)
    expect(result.data?.warnings).toEqual([])
    expect(result.data?.preparation.completionPct).toBeGreaterThan(0)
    expect(result.data?.preparation.items.find(item => item.id === 'sales')).toEqual(expect.objectContaining({
      status: 'complete',
      count: 10,
    }))
    expect(result.data?.restaurant).toEqual(expect.objectContaining({
      id: RESTAURANT_ID,
      consultantName: 'Zinergia',
    }))
    expect(result.data?.meetingRequests[0].report?.id).toBe(REPORT_ID)
    expect(result.data?.deliveryReports[0]).toEqual(expect.objectContaining({
      id: REPORT_ID,
      status: 'MEETING_REQUESTED',
      openRequestCount: 1,
      nextActionHref: '/consultant',
    }))
    expect(calls.find(call => call.table === 'restaurants')?.filters).toContainEqual(['eq', 'id', RESTAURANT_ID])
    expect(calls.find(call => call.table === 'professional_report_drafts')?.filters).toEqual(expect.arrayContaining([
      ['eq', 'restaurant_id', RESTAURANT_ID],
      ['not', 'published_at', 'is', null],
    ]))
    expect(calls.find(call => call.table === 'portal_meeting_requests')?.filters).toContainEqual(['eq', 'restaurant_id', RESTAURANT_ID])
    const readyReportCall = calls.find(call =>
      call.table === 'professional_report_drafts' &&
      call.filters.some(filter => filter[0] === 'eq' && filter[1] === 'status' && filter[2] === 'READY')
    )
    expect(readyReportCall?.filters).toContainEqual(['eq', 'restaurant_id', RESTAURANT_ID])
    expect(readyReportCall?.limitValue).toBe(6)
    expect(calls.find(call => call.table === 'daily_sales' && call.head)?.filters).toEqual(expect.arrayContaining([
      ['eq', 'restaurant_id', RESTAURANT_ID],
      ['gte', 'date', expect.any(String)],
      ['lte', 'date', expect.any(String)],
    ]))
  })

  it('marks ready unpublished reports as pending publication in the delivery workflow', async () => {
    tableResults.professional_report_drafts = {
      data: [{
        id: REPORT_ID,
        period_from: '2026-02-01',
        period_to: '2026-02-28',
        version: 2,
        status: 'READY',
        published_at: null,
      }],
      error: null,
    }
    tableResults.portal_meeting_requests = { data: [], error: null }
    const { getConsultantWorkspace } = await import('@/app/actions/consultant')

    const result = await getConsultantWorkspace()

    expect(result.success).toBe(true)
    expect(result.data?.deliveryReports).toEqual([
      expect.objectContaining({
        id: REPORT_ID,
        status: 'READY_TO_PUBLISH',
        nextActionHref: '/reports?from=2026-02-01&to=2026-02-28',
        nextActionLabel: 'Publicar desde informes',
      }),
    ])
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
      'No se pudo cargar el flujo de entrega.',
      'No se pudieron cargar las solicitudes de reunión.',
      'No se pudo completar toda la checklist de preparación.',
    ])
  })

  it('adds a warning when the preparation checklist cannot be fully counted', async () => {
    tableResults.daily_sales = { data: null, error: { message: 'sales unavailable' } }
    const { getConsultantWorkspace } = await import('@/app/actions/consultant')

    const result = await getConsultantWorkspace()

    expect(result.success).toBe(true)
    expect(result.data?.warnings).toContain('No se pudo completar toda la checklist de preparación.')
    expect(result.data?.preparation.items.find(item => item.id === 'sales')).toEqual(expect.objectContaining({
      status: 'missing',
      count: 0,
    }))
  })

  it('loads preparation checklist for a specific month scoped to restaurant', async () => {
    const { getPreparationChecklistForPeriod } = await import('@/app/actions/consultant')

    const result = await getPreparationChecklistForPeriod({ month: '2026-02' })

    expect(result.success).toBe(true)
    expect(result.data?.period.month).toBe('2026-02')
    expect(result.data?.period.from).toBe('2026-02-01')
    expect(result.data?.period.to).toBe('2026-02-28')

    const salesCall = calls.find(call => call.table === 'daily_sales' && call.head)
    expect(salesCall?.filters).toEqual(expect.arrayContaining([
      ['eq', 'restaurant_id', RESTAURANT_ID],
      ['gt', 'revenue_total', 0],
      ['gte', 'date', '2026-02-01'],
      ['lte', 'date', '2026-02-28'],
    ]))

    const menuEngineeringCall = calls.find(call => call.table === 'menu_reports' && call.head)
    expect(menuEngineeringCall?.filters).toEqual(expect.arrayContaining([
      ['eq', 'restaurant_id', RESTAURANT_ID],
      ['eq', 'status', 'ANALYZED'],
      ['lte', 'date_from', '2026-02-28'],
      ['gte', 'date_to', '2026-02-01'],
    ]))

    const draftCall = calls.find(call =>
      call.table === 'professional_report_drafts' &&
      call.head &&
      call.filters.some(filter => filter[0] === 'eq' && filter[1] === 'period_from' && filter[2] === '2026-02-01')
    )
    expect(draftCall).toBeDefined()
  })

  it('rejects invalid month format for checklist period', async () => {
    const { getPreparationChecklistForPeriod } = await import('@/app/actions/consultant')

    const result = await getPreparationChecklistForPeriod({ month: 'invalid' })

    expect(result).toEqual({ success: false, error: 'Periodo inválido.' })
    expect(calls).toEqual([])
  })

  it('returns error when no restaurant for checklist period', async () => {
    mockRestaurantId = null
    const { getPreparationChecklistForPeriod } = await import('@/app/actions/consultant')

    const result = await getPreparationChecklistForPeriod({ month: '2026-02' })

    expect(result).toEqual({ success: false, error: 'No hay restaurante activo.' })
    expect(calls).toEqual([])
  })

  it('points partial checklist items to the most relevant operational page', async () => {
    tableResults.shifts = { data: [], error: null }
    tableResults.daily_recipe_sales = { data: [], error: null }
    const { getPreparationChecklistForPeriod } = await import('@/app/actions/consultant')

    const result = await getPreparationChecklistForPeriod({ month: '2026-02' })

    expect(result.success).toBe(true)
    expect(result.data?.items.find(item => item.id === 'staff')).toEqual(expect.objectContaining({
      status: 'partial',
      href: '/staff/schedule',
    }))
    expect(result.data?.items.find(item => item.id === 'menu')).toEqual(expect.objectContaining({
      status: 'partial',
      href: '/stock',
    }))
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
