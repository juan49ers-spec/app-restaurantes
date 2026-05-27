import { beforeEach, describe, expect, it, vi } from 'vitest'

type QueryError = { message: string; code?: string }
type QueryResult = { data: unknown; error: QueryError | null }
type Filter = ['eq' | 'gte' | 'lte' | 'not' | 'in', string, unknown, unknown?]

const RESTAURANT_ID = '550e8400-e29b-41d4-a716-446655440000'
const OTHER_RESTAURANT_ID = '550e8400-e29b-41d4-a716-446655440999'
const REPORT_ID = '11111111-1111-4111-8111-111111111111'

const validReportSnapshot = {
  schemaVersion: 'professional-report/v1',
  generatedAt: '2026-03-01T10:00:00.000Z',
  restaurant: { id: RESTAURANT_ID, name: 'Txiquita Tasca' },
  period: { from: '2026-02-01', to: '2026-02-28', days: 28 },
  quality: { status: 'OK', confidence: 90, issues: [] },
  sourceMap: [],
  executiveSummary: {
    headline: 'Informe preparado',
    keyFindings: [],
    blockingIssues: [],
  },
  sections: [],
}

let mockRestaurantId: string | null = RESTAURANT_ID
let tableResults: Record<string, QueryResult> = {}
let calls: Array<{
  table: string
  filters: Filter[]
  select?: string
  orders: Array<{ column: string; ascending?: boolean }>
  limitValue?: number
  updateValue?: Record<string, unknown>
  insertValue?: Record<string, unknown>
}> = []

class MockQuery {
  private filters: Filter[] = []
  private orders: Array<{ column: string; ascending?: boolean }> = []
  private selectValue?: string

  constructor(
    private readonly table: string,
    private readonly operation: 'select' | 'update' | 'insert' = 'select',
    private readonly mutationValue?: Record<string, unknown>
  ) {}

  select(value?: string) {
    this.selectValue = value
    return this
  }

  update(value: Record<string, unknown>) {
    return new MockQuery(this.table, 'update', value)
  }

  insert(value: Record<string, unknown>) {
    return new MockQuery(this.table, 'insert', value)
  }

  eq(column: string, value: unknown) {
    this.filters.push(['eq', column, value])
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

  in(column: string, value: unknown[]) {
    this.filters.push(['in', column, value])
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
      orders: this.orders,
      limitValue: this.limitValue,
      updateValue: this.operation === 'update' ? this.mutationValue : undefined,
      insertValue: this.operation === 'insert' ? this.mutationValue : undefined,
    })

    if (this.operation === 'update' && this.table === 'professional_report_drafts') {
      const ownsRestaurant = this.filters.some(filter => filter[0] === 'eq' && filter[1] === 'restaurant_id' && filter[2] === RESTAURANT_ID)
      const requiresReady = this.filters.some(filter => filter[0] === 'eq' && filter[1] === 'status' && filter[2] === 'READY')
      const isPublishing = this.mutationValue && 'published_at' in this.mutationValue && this.mutationValue.published_at !== null
      if (!ownsRestaurant || (isPublishing && !requiresReady)) {
        return { data: null, error: { message: 'not found' } }
      }
      return {
        data: {
          id: REPORT_ID,
          published_at: this.mutationValue?.published_at ?? null,
          viewed_at: this.mutationValue?.viewed_at ?? null,
        },
        error: null,
      }
    }

    if (this.operation === 'insert' && this.table === 'portal_meeting_requests') {
      return { data: { id: '22222222-2222-4222-8222-222222222222' }, error: null }
    }

    return tableResults[this.table] ?? { data: [], error: null }
  }
}

const mockSupabase = {
  from: vi.fn((table: string) => new MockQuery(table)),
  auth: {
    getUser: vi.fn(async () => ({
      data: { user: { id: 'user-1' } },
      error: null,
    })),
  },
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

describe('portal server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRestaurantId = RESTAURANT_ID
    calls = []
    tableResults = {
      professional_report_drafts: {
        data: [
          {
            id: REPORT_ID,
            period_from: '2026-02-01',
            period_to: '2026-02-28',
            version: 1,
            status: 'READY',
            schema_version: 'professional-report/v1',
            report_snapshot: validReportSnapshot,
            narrative_overrides: {},
            created_at: '2026-03-01T10:00:00.000Z',
            updated_at: '2026-03-01T10:00:00.000Z',
            exported_at: null,
            published_at: '2026-03-02T10:00:00.000Z',
            published_by: 'user-1',
            viewed_at: null,
          },
        ],
        error: null,
      },
      restaurants: {
        data: {
          id: RESTAURANT_ID,
          name: 'Txiquita Tasca',
          consultant_name: 'ControlHub Consulting',
          consultant_email: 'consultor@controlhub.es',
          consultant_logo_url: 'https://controlhub.es/logo.png',
        },
        error: null,
      },
      daily_sales: {
        data: [{ revenue_total: 1000 }, { revenue_total: 1500 }],
        error: null,
      },
      monthly_targets: {
        data: { revenue_target: 6000 },
        error: null,
      },
      portal_meeting_requests: {
        data: null,
        error: null,
      },
    }
  })

  it('publishes only READY drafts owned by the active restaurant', async () => {
    tableResults.professional_report_drafts = {
      data: { id: REPORT_ID, report_snapshot: validReportSnapshot },
      error: null,
    }
    const { publishReportDraft } = await import('@/app/actions/portal')

    const result = await publishReportDraft(REPORT_ID)

    expect(result.success).toBe(true)
    const validationCall = calls.find(item =>
      item.table === 'professional_report_drafts' &&
      item.select === 'id, report_snapshot'
    )
    expect(validationCall?.filters).toEqual(expect.arrayContaining([
      ['eq', 'id', REPORT_ID],
      ['eq', 'restaurant_id', RESTAURANT_ID],
      ['eq', 'status', 'READY'],
    ]))

    const call = calls.find(item => item.table === 'professional_report_drafts' && item.updateValue)
    expect(call?.filters).toEqual(expect.arrayContaining([
      ['eq', 'id', REPORT_ID],
      ['eq', 'restaurant_id', RESTAURANT_ID],
      ['eq', 'status', 'READY'],
    ]))
    expect(call?.updateValue).toEqual(expect.objectContaining({
      published_by: 'user-1',
    }))
  })

  it('rejects publishing when the saved report snapshot has critical blockers', async () => {
    tableResults.professional_report_drafts = {
      data: {
        id: REPORT_ID,
        report_snapshot: {
          ...validReportSnapshot,
          quality: {
            status: 'MISSING',
            confidence: 30,
            issues: [{
              id: 'sales.missing',
              section: 'sales',
              status: 'MISSING',
              severity: 'critical',
              message: 'No hay ventas cargadas para el periodo.',
              sourceIds: ['daily_sales'],
            }],
          },
        },
      },
      error: null,
    }
    const { publishReportDraft } = await import('@/app/actions/portal')

    const result = await publishReportDraft(REPORT_ID)

    expect(result).toEqual({
      success: false,
      error: 'El informe tiene bloqueos criticos y no puede publicarse.',
    })
    expect(calls.some(item => item.table === 'professional_report_drafts' && item.updateValue)).toBe(false)
  })

  it('rejects publishing a draft from another restaurant', async () => {
    mockRestaurantId = OTHER_RESTAURANT_ID
    const { publishReportDraft } = await import('@/app/actions/portal')

    const result = await publishReportDraft(REPORT_ID)

    expect(result).toEqual({ success: false, error: 'No se pudo publicar el informe.' })
  })

  it('lists only published reports without report snapshots', async () => {
    const { getPublishedReports } = await import('@/app/actions/portal')

    const result = await getPublishedReports()

    expect(result.success).toBe(true)
    const call = calls.find(item => item.table === 'professional_report_drafts')
    expect(call?.filters).toEqual(expect.arrayContaining([
      ['eq', 'restaurant_id', RESTAURANT_ID],
      ['not', 'published_at', 'is', null],
    ]))
    expect(call?.select).not.toContain('report_snapshot')
    expect(call?.orders).toContainEqual({ column: 'published_at', ascending: false })
  })

  it('rejects unpublished report details', async () => {
    tableResults.professional_report_drafts = { data: null, error: null }
    const { getPublishedReportDetail } = await import('@/app/actions/portal')

    const result = await getPublishedReportDetail(REPORT_ID)

    expect(result).toEqual({ success: false, error: 'Informe publicado no encontrado.' })
    const call = calls.find(item => item.table === 'professional_report_drafts')
    expect(call?.filters).toContainEqual(['not', 'published_at', 'is', null])
  })

  it('returns consultant identity and current month revenue progress', async () => {
    const { getPortalContext } = await import('@/app/actions/portal')

    const result = await getPortalContext()

    expect(result.success).toBe(true)
    expect(result.data).toEqual(expect.objectContaining({
      restaurantName: 'Txiquita Tasca',
      consultantName: 'ControlHub Consulting',
      consultantEmail: 'consultor@controlhub.es',
      consultantLogoUrl: 'https://controlhub.es/logo.png',
      liveRevenue: expect.objectContaining({
        revenueActual: 2500,
        revenueTarget: 6000,
        completionPct: 0.4167,
      }),
    }))
    expect(calls.find(call => call.table === 'daily_sales')?.filters).toContainEqual(['eq', 'restaurant_id', RESTAURANT_ID])
    expect(calls.find(call => call.table === 'monthly_targets')?.filters).toContainEqual(['eq', 'restaurant_id', RESTAURANT_ID])
  })

  it('marks a published report as viewed only for the active restaurant', async () => {
    const { markPublishedReportViewedForRestaurant } = await import('@/lib/portal')

    const result = await markPublishedReportViewedForRestaurant(REPORT_ID, RESTAURANT_ID)

    expect(result.success).toBe(true)
    const call = calls.find(item => item.table === 'professional_report_drafts' && item.updateValue)
    expect(call?.filters).toEqual(expect.arrayContaining([
      ['eq', 'id', REPORT_ID],
      ['eq', 'restaurant_id', RESTAURANT_ID],
      ['not', 'published_at', 'is', null],
    ]))
    expect(call?.updateValue?.viewed_at).toEqual(expect.any(String))
  })

  it('creates a pending meeting request for the active restaurant', async () => {
    tableResults.professional_report_drafts = { data: { id: REPORT_ID }, error: null }
    const { requestConsultantMeeting } = await import('@/app/actions/portal')

    const result = await requestConsultantMeeting({ reportId: REPORT_ID, message: ' Revisamos la carta. ' })

    expect(result).toEqual({ success: true, data: { id: '22222222-2222-4222-8222-222222222222', reused: false } })
    const duplicateCheckCall = calls.find(call =>
      call.table === 'portal_meeting_requests' &&
      call.filters.some(filter => filter[0] === 'in')
    )
    expect(duplicateCheckCall?.filters).toEqual(expect.arrayContaining([
      ['eq', 'restaurant_id', RESTAURANT_ID],
      ['eq', 'report_id', REPORT_ID],
      ['in', 'status', ['PENDING', 'ACKNOWLEDGED']],
    ]))
    expect(duplicateCheckCall?.limitValue).toBe(1)

    const insertCall = calls.find(call => call.table === 'portal_meeting_requests' && call.insertValue)
    expect(insertCall?.insertValue).toEqual({
      restaurant_id: RESTAURANT_ID,
      report_id: REPORT_ID,
      message: 'Revisamos la carta.',
      status: 'PENDING',
      created_by: 'user-1',
    })
  })

  it('reuses an open meeting request instead of creating a duplicate', async () => {
    tableResults.professional_report_drafts = { data: { id: REPORT_ID }, error: null }
    tableResults.portal_meeting_requests = {
      data: { id: '33333333-3333-4333-8333-333333333333' },
      error: null,
    }
    const { requestConsultantMeeting } = await import('@/app/actions/portal')

    const result = await requestConsultantMeeting({ reportId: REPORT_ID, message: 'Nueva nota' })

    expect(result).toEqual({
      success: true,
      data: { id: '33333333-3333-4333-8333-333333333333', reused: true },
    })
    expect(calls.some(call => call.table === 'portal_meeting_requests' && call.insertValue)).toBe(false)
  })
})
