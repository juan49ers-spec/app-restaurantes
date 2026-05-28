import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildPortalPeriodComparison, buildPortalSuggestedActions } from '@/lib/portal-insights'
import { buildProfessionalReportPresentation } from '@/lib/reporting'
import { buildConsultantBriefing } from '@/lib/reporting/consultant-briefing'
import { evaluateProfessionalReportQualityGate } from '@/lib/reporting/quality-gate'
import type { ProfessionalRestaurantReport } from '@/lib/reporting/types'

type DbRow = Record<string, unknown>
type Filter =
  | ['eq', string, unknown]
  | ['neq', string, unknown]
  | ['gt', string, unknown]
  | ['gte', string, unknown]
  | ['lte', string, unknown]
  | ['in', string, unknown[]]
  | ['not', string, string, unknown]

type QueryResult = {
  data: unknown
  error: { message: string; code?: string } | null
  count?: number | null
}

const RESTAURANT_ID = '550e8400-e29b-41d4-a716-446655440000'
const USER_ID = '99999999-9999-4999-8999-999999999999'
const PERIOD = { from: '2026-05-01', to: '2026-05-31' }
const SALES_CSV = `date,revenue_total,total_covers
2026-05-01,1500.50,45
2026-05-02,1800.00,52
2026-05-03,2100.75,61
2026-05-04,1750.00,49
2026-05-05,1650.00,44
2026-05-06,1900.00,57
2026-05-07,2050.00,60`
const EXPENSES_CSV = `expense_date,category,amount,description
2026-05-01,PROVEEDORES_COMIDA,450.00,Compra semanal
2026-05-15,NOMINAS_LIQUIDAS,2800.00,Nóminas mayo
2026-05-20,MANTENIMIENTO,350.00,Mantenimiento`

let db: Record<string, DbRow[]> = createInitialDb()
let mockRestaurantId: string | null = RESTAURANT_ID
let idCounter = 1

function createInitialDb(): Record<string, DbRow[]> {
  return {
    restaurants: [{
      id: RESTAURANT_ID,
      name: 'Txiquita Tasca',
      consultant_name: 'ControlHub Consulting',
      consultant_email: 'consultor@controlhub.es',
      consultant_logo_url: null,
    }],
    daily_sales: [
      { id: 'prev-sale-1', restaurant_id: RESTAURANT_ID, date: '2026-04-01', revenue_total: 1200 },
      { id: 'prev-sale-2', restaurant_id: RESTAURANT_ID, date: '2026-04-02', revenue_total: 1300 },
    ],
    operating_expenses: [
      { id: 'prev-expense-1', restaurant_id: RESTAURANT_ID, expense_date: '2026-04-01', category: 'PROVEEDORES_COMIDA', amount: 500 },
      { id: 'prev-expense-2', restaurant_id: RESTAURANT_ID, expense_date: '2026-04-15', category: 'NOMINAS_LIQUIDAS', amount: 2400 },
    ],
    monthly_targets: [],
    employees: [{ id: 'employee-1', restaurant_id: RESTAURANT_ID, role: 'Chef', status: 'ACTIVE', hourly_rate: 16 }],
    shifts: [{ id: 'shift-1', restaurant_id: RESTAURANT_ID, date: '2026-05-02', status: 'completed', estimated_cost: 128 }],
    suppliers: [{ id: 'supplier-1', restaurant_id: RESTAURANT_ID, name: 'Proveedor Demo', reliability_score: 86 }],
    invoices: [{ id: 'invoice-1', restaurant_id: RESTAURANT_ID, date: '2026-05-10', status: 'completed', total_amount: 450, supplier_id: 'supplier-1' }],
    recipes: [{ id: 'recipe-1', restaurant_id: RESTAURANT_ID, name: 'Tortilla', selling_price: 12, current_cost: 4 }],
    daily_recipe_sales: [{ id: 'recipe-sale-1', restaurant_id: RESTAURANT_ID, date: '2026-05-02', recipe_id: 'recipe-1', quantity_sold: 18 }],
    menu_reports: [],
    menu_report_items: [],
    professional_report_drafts: [],
    portal_meeting_requests: [],
  }
}

function nextId(_prefix: string) {
  idCounter += 1
  return `00000000-0000-4000-8000-${String(idCounter).padStart(12, '0')}`
}

function matchesFilter(row: DbRow, filter: Filter) {
  const value = row[filter[1]]

  if (filter[0] === 'eq') return value === filter[2]
  if (filter[0] === 'neq') return value !== filter[2]
  if (filter[0] === 'gt') return typeof value === 'number' && value > Number(filter[2])
  if (filter[0] === 'gte') return String(value) >= String(filter[2])
  if (filter[0] === 'lte') return String(value) <= String(filter[2])
  if (filter[0] === 'in') return filter[2].includes(value)
  if (filter[0] === 'not' && filter[2] === 'is' && filter[3] === null) return value !== null && value !== undefined
  return true
}

function sortRows(rows: DbRow[], orders: Array<{ column: string; ascending?: boolean }>) {
  return [...rows].sort((left, right) => {
    for (const order of orders) {
      const leftValue = String(left[order.column] ?? '')
      const rightValue = String(right[order.column] ?? '')
      if (leftValue === rightValue) continue
      const direction = order.ascending === false ? -1 : 1
      return leftValue > rightValue ? direction : -direction
    }
    return 0
  })
}

class MockQuery {
  private filters: Filter[] = []
  private orders: Array<{ column: string; ascending?: boolean }> = []
  private limitValue: number | null = null
  private selectOptions: { count?: string; head?: boolean } | undefined
  private operation: 'select' | 'insert' | 'update' | 'upsert' = 'select'
  private mutationValue: unknown

  constructor(private readonly table: string) {}

  select(_columns?: string, options?: { count?: string; head?: boolean }) {
    this.selectOptions = options
    return this
  }

  insert(value: unknown) {
    this.operation = 'insert'
    this.mutationValue = value
    return this
  }

  update(value: unknown) {
    this.operation = 'update'
    this.mutationValue = value
    return this
  }

  upsert(value: unknown, options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.operation = 'upsert'
    this.mutationValue = { value, options }
    return this
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

  gte(column: string, value: unknown) {
    this.filters.push(['gte', column, value])
    return this
  }

  lte(column: string, value: unknown) {
    this.filters.push(['lte', column, value])
    return this
  }

  in(column: string, value: unknown[]) {
    this.filters.push(['in', column, value])
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

  maybeSingle() {
    return Promise.resolve(this.resolve(true))
  }

  single() {
    return Promise.resolve(this.resolve(true))
  }

  then(resolve: (value: QueryResult) => unknown, reject?: (reason?: unknown) => unknown) {
    return Promise.resolve(this.resolve(false)).then(resolve, reject)
  }

  private filteredRows() {
    return (db[this.table] || []).filter(row => this.filters.every(filter => matchesFilter(row, filter)))
  }

  private resolve(single: boolean): QueryResult {
    if (this.operation === 'insert') return this.resolveInsert(single)
    if (this.operation === 'upsert') return this.resolveUpsert()
    if (this.operation === 'update') return this.resolveUpdate(single)
    return this.resolveSelect(single)
  }

  private resolveSelect(single: boolean): QueryResult {
    let rows = sortRows(this.filteredRows(), this.orders)
    if (this.limitValue !== null) rows = rows.slice(0, this.limitValue)

    if (this.selectOptions?.head) {
      return { data: null, error: null, count: rows.length }
    }

    return { data: single ? rows[0] ?? null : rows, error: null }
  }

  private resolveInsert(single: boolean): QueryResult {
    const rows = (Array.isArray(this.mutationValue) ? this.mutationValue : [this.mutationValue])
      .map(value => this.withDefaults(value as DbRow))
    db = { ...db, [this.table]: [...(db[this.table] || []), ...rows] }
    return { data: single ? rows[0] ?? null : rows, error: null }
  }

  private resolveUpsert(): QueryResult {
    const mutation = this.mutationValue as { value: unknown; options?: { onConflict?: string; ignoreDuplicates?: boolean } }
    const rows = (Array.isArray(mutation.value) ? mutation.value : [mutation.value])
      .map(value => this.withDefaults(value as DbRow))
    const currentRows = [...(db[this.table] || [])]
    const insertedRows: DbRow[] = []

    for (const row of rows) {
      const conflictColumns = (mutation.options?.onConflict || '').split(',').filter(Boolean)
      const existingIndex = conflictColumns.length > 0
        ? currentRows.findIndex(item => conflictColumns.every(column => item[column] === row[column]))
        : -1

      if (existingIndex >= 0 && mutation.options?.ignoreDuplicates) continue
      if (existingIndex >= 0) currentRows[existingIndex] = { ...currentRows[existingIndex], ...row }
      if (existingIndex < 0) currentRows.push(row)
      insertedRows.push(row)
    }

    db = { ...db, [this.table]: currentRows }
    return { data: insertedRows, error: null }
  }

  private resolveUpdate(single: boolean): QueryResult {
    const mutation = this.mutationValue as DbRow
    const updatedRows: DbRow[] = []
    const rows = (db[this.table] || []).map(row => {
      if (!this.filters.every(filter => matchesFilter(row, filter))) return row
      const updated = { ...row, ...mutation, updated_at: new Date('2026-05-28T08:00:00.000Z').toISOString() }
      updatedRows.push(updated)
      return updated
    })

    db = { ...db, [this.table]: rows }
    return { data: single ? updatedRows[0] ?? null : updatedRows, error: null }
  }

  private withDefaults(row: DbRow): DbRow {
    if (this.table === 'daily_sales') return { id: nextId('sale'), ...row }
    if (this.table === 'operating_expenses') return { id: nextId('expense'), ...row }
    if (this.table === 'portal_meeting_requests') {
      return {
        id: nextId('meeting'),
        created_at: '2026-05-28T08:00:00.000Z',
        ...row,
      }
    }
    if (this.table === 'professional_report_drafts') {
      return {
        id: nextId('draft'),
        created_at: '2026-05-28T08:00:00.000Z',
        updated_at: '2026-05-28T08:00:00.000Z',
        exported_at: null,
        published_at: null,
        published_by: null,
        viewed_at: null,
        ...row,
      }
    }
    return row
  }
}

const mockSupabase = {
  from: vi.fn((table: string) => new MockQuery(table)),
  auth: {
    getUser: vi.fn(async () => ({ data: { user: { id: USER_ID } }, error: null })),
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

describe('full consultant to client delivery flow', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    db = createInitialDb()
    mockRestaurantId = RESTAURANT_ID
    idCounter = 1
  })

  it('delivers a report from data import to portal publication, meeting follow-up and unpublish', async () => {
    const { importFinancialCsv } = await import('@/app/actions/financial-control')
    const { getPreparationChecklistForPeriod, getConsultantWorkspace, updateMeetingRequestStatus } = await import('@/app/actions/consultant')
    const { getProfessionalReportDraft, saveProfessionalReportDraft } = await import('@/app/actions/professional-reporting')
    const { publishReportDraft, getPublishedReports, getPublishedReportDetail, requestConsultantMeeting, unpublishReportDraft } = await import('@/app/actions/portal')
    const { markPublishedReportViewedForRestaurant } = await import('@/lib/portal')

    const salesImport = await importFinancialCsv({ kind: 'sales', csvText: SALES_CSV })
    expect(salesImport.success).toBe(true)

    const expensesImport = await importFinancialCsv({ kind: 'expenses', csvText: EXPENSES_CSV })
    expect(expensesImport.success).toBe(true)

    const checklist = await getPreparationChecklistForPeriod({ month: '2026-05' })
    expect(checklist.success).toBe(true)
    expect(checklist.data?.items.find(item => item.id === 'sales')).toEqual(expect.objectContaining({ status: 'complete' }))
    expect(checklist.data?.items.find(item => item.id === 'expenses')).toEqual(expect.objectContaining({ status: 'complete' }))

    const draftResponse = await getProfessionalReportDraft(PERIOD)
    expect(draftResponse.success).toBe(true)
    const draftReport = draftResponse.data as ProfessionalRestaurantReport
    expect(draftReport.sections.find(section => section.id === 'sales')?.quality.status).not.toBe('MISSING')
    expect(draftReport.sections.find(section => section.id === 'costs')?.quality.status).not.toBe('MISSING')

    const saved = await saveProfessionalReportDraft({
      period: PERIOD,
      status: 'READY',
      narrativeOverrides: {},
    })
    expect(saved.success).toBe(true)
    expect(saved.data?.id).toEqual(expect.any(String))
    expect(saved.data?.version).toBe(1)

    const savedDraft = db.professional_report_drafts.find(row => row.id === saved.data?.id)
    const snapshot = savedDraft?.report_snapshot as ProfessionalRestaurantReport
    const gate = evaluateProfessionalReportQualityGate(snapshot)
    expect(gate.blockers).toEqual([])

    const published = await publishReportDraft(saved.data?.id ?? '')
    expect(published.success).toBe(true)
    expect(published.data?.publishedAt).toEqual(expect.any(String))

    const publishedReports = await getPublishedReports()
    expect(publishedReports.success).toBe(true)
    expect(publishedReports.data).toEqual([
      expect.objectContaining({
        id: saved.data?.id,
        publishedAt: expect.any(String),
      }),
    ])

    const detail = await getPublishedReportDetail(saved.data?.id ?? '')
    expect(detail.success).toBe(true)
    expect(detail.data?.report.restaurant.id).toBe(RESTAURANT_ID)

    const viewed = await markPublishedReportViewedForRestaurant(saved.data?.id ?? '', RESTAURANT_ID)
    expect(viewed.success).toBe(true)
    expect(db.professional_report_drafts.find(row => row.id === saved.data?.id)?.viewed_at).toEqual(expect.any(String))

    const presentation = buildProfessionalReportPresentation(snapshot)
    expect(presentation.chapters.length).toBeGreaterThan(0)
    expect(presentation.conclusions.length).toBeGreaterThan(0)
    expect(presentation.kpis.length).toBeGreaterThan(0)

    const comparison = buildPortalPeriodComparison({
      currentFrom: PERIOD.from,
      currentTo: PERIOD.to,
      currentRevenue: 5401.25,
      currentExpenses: 3600,
      previousRevenue: 2500,
      previousExpenses: 2900,
    })
    expect(comparison.hasPreviousData).toBe(true)
    expect(comparison.deltas.revenue.value).toBe(2901.25)

    const suggestedActions = buildPortalSuggestedActions(presentation)
    expect(Array.isArray(suggestedActions)).toBe(true)

    const briefing = buildConsultantBriefing(presentation)
    expect(briefing.headline).toContain('Txiquita Tasca')
    expect(briefing.priorities.length).toBeGreaterThan(0)
    expect(briefing.nextSteps.length).toBeGreaterThan(0)

    const meeting = await requestConsultantMeeting({
      reportId: saved.data?.id ?? '',
      message: 'Quiero revisar los gastos',
    })
    expect(meeting.success).toBe(true)
    expect(meeting.data?.reused).toBe(false)
    expect(db.portal_meeting_requests).toHaveLength(1)
    expect(db.portal_meeting_requests[0]).toEqual(expect.objectContaining({
      report_id: saved.data?.id,
      status: 'PENDING',
      message: 'Quiero revisar los gastos',
    }))

    const duplicatedMeeting = await requestConsultantMeeting({
      reportId: saved.data?.id ?? '',
      message: 'Quiero revisar otra vez',
    })
    expect(duplicatedMeeting).toEqual({
      success: true,
      data: { id: meeting.data?.id, reused: true },
    })
    expect(db.portal_meeting_requests).toHaveLength(1)

    const completedMeeting = await updateMeetingRequestStatus({
      id: meeting.data?.id ?? '',
      status: 'COMPLETED',
    })
    expect(completedMeeting.success).toBe(true)

    const workspace = await getConsultantWorkspace()
    expect(workspace.success).toBe(true)
    expect(workspace.data?.publishedReports).toEqual([
      expect.objectContaining({
        id: saved.data?.id,
        viewedAt: expect.any(String),
      }),
    ])
    expect(workspace.data?.meetingRequests).toEqual([
      expect.objectContaining({
        id: meeting.data?.id,
        status: 'COMPLETED',
      }),
    ])
    expect(workspace.data?.deliveryReports).toEqual([
      expect.objectContaining({
        id: saved.data?.id,
        status: 'FOLLOW_UP_COMPLETE',
      }),
    ])

    const unpublished = await unpublishReportDraft(saved.data?.id ?? '')
    expect(unpublished.success).toBe(true)

    const afterUnpublish = await getPublishedReports()
    expect(afterUnpublish.success).toBe(true)
    expect(afterUnpublish.data?.some(report => report.id === saved.data?.id)).toBe(false)
  })
})

describe('delivery flow edge cases', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    db = createInitialDb()
    mockRestaurantId = RESTAURANT_ID
    idCounter = 1
  })

  it('rejects publishing a READY report with critical blockers', async () => {
    const { publishReportDraft } = await import('@/app/actions/portal')
    const blockedReport = buildBlockedSnapshot()
    db.professional_report_drafts = [{
      id: '11111111-1111-4111-8111-111111111111',
      restaurant_id: RESTAURANT_ID,
      period_from: PERIOD.from,
      period_to: PERIOD.to,
      version: 1,
      status: 'READY',
      schema_version: 'professional-report/v1',
      report_snapshot: blockedReport,
      narrative_overrides: {},
      created_at: '2026-05-28T08:00:00.000Z',
      updated_at: '2026-05-28T08:00:00.000Z',
      exported_at: null,
      published_at: null,
      published_by: null,
      viewed_at: null,
    }]

    const result = await publishReportDraft('11111111-1111-4111-8111-111111111111')

    expect(result).toEqual({
      success: false,
      error: 'El informe tiene bloqueos criticos y no puede publicarse.',
    })
    expect(db.professional_report_drafts[0].published_at).toBeNull()
  })

  it('does not open unpublished report details from the portal', async () => {
    const { getPublishedReportDetail } = await import('@/app/actions/portal')
    db.professional_report_drafts = [{
      id: '11111111-1111-4111-8111-111111111111',
      restaurant_id: RESTAURANT_ID,
      period_from: PERIOD.from,
      period_to: PERIOD.to,
      version: 1,
      status: 'READY',
      schema_version: 'professional-report/v1',
      report_snapshot: buildBlockedSnapshot(),
      narrative_overrides: {},
      created_at: '2026-05-28T08:00:00.000Z',
      updated_at: '2026-05-28T08:00:00.000Z',
      exported_at: null,
      published_at: null,
      published_by: null,
    }]

    const result = await getPublishedReportDetail('11111111-1111-4111-8111-111111111111')

    expect(result).toEqual({ success: false, error: 'Informe publicado no encontrado.' })
  })

  it('reports missing blocker checklist items for an empty month', async () => {
    const { getPreparationChecklistForPeriod } = await import('@/app/actions/consultant')

    const result = await getPreparationChecklistForPeriod({ month: '2026-06' })

    expect(result.success).toBe(true)
    expect(result.data?.items.find(item => item.id === 'sales')).toEqual(expect.objectContaining({
      status: 'missing',
      severity: 'blocker',
    }))
    expect(result.data?.items.find(item => item.id === 'expenses')).toEqual(expect.objectContaining({
      status: 'missing',
      severity: 'blocker',
    }))
  })

  it('blocks quality gate when a section has conflicting data', () => {
    const result = evaluateProfessionalReportQualityGate(buildConflictSnapshot())

    expect(result.status).toBe('BLOCKED')
    expect(result.canPublish).toBe(false)
    expect(result.blockers).toEqual([
      expect.objectContaining({
        id: 'section.sales.conflict',
        section: 'sales',
      }),
    ])
  })

  it('returns clear Zod validation errors instead of crashing', async () => {
    const { getPublishedReportDetail, requestConsultantMeeting } = await import('@/app/actions/portal')
    const { getPreparationChecklistForPeriod } = await import('@/app/actions/consultant')

    await expect(getPublishedReportDetail('not-a-uuid')).resolves.toEqual({
      success: false,
      error: 'Informe inválido.',
    })
    await expect(requestConsultantMeeting({ reportId: 'not-a-uuid' })).resolves.toEqual({
      success: false,
      error: 'Solicitud inválida.',
    })
    await expect(getPreparationChecklistForPeriod({ month: '2026-13-99' })).resolves.toEqual({
      success: false,
      error: 'Periodo inválido.',
    })
  })
})

function buildBlockedSnapshot(): ProfessionalRestaurantReport {
  return {
    schemaVersion: 'professional-report/v1',
    generatedAt: '2026-05-28T08:00:00.000Z',
    restaurant: { id: RESTAURANT_ID, name: 'Txiquita Tasca' },
    period: { from: PERIOD.from, to: PERIOD.to, days: 31 },
    quality: {
      status: 'MISSING',
      confidence: 20,
      issues: [{
        id: 'sales.missing',
        section: 'sales',
        status: 'MISSING',
        severity: 'critical',
        message: 'No hay ventas cargadas para el periodo.',
        sourceIds: ['daily_sales.revenue'],
      }],
    },
    sourceMap: [],
    executiveSummary: {
      headline: 'Informe bloqueado',
      keyFindings: [],
      blockingIssues: [],
    },
    sections: [],
  }
}

function buildConflictSnapshot(): ProfessionalRestaurantReport {
  const base = buildBlockedSnapshot()
  return {
    ...base,
    quality: { status: 'CONFLICT', confidence: 50, issues: [] },
    sections: [{
      id: 'sales',
      title: 'Ventas',
      quality: {
        section: 'sales',
        status: 'CONFLICT',
        confidence: 50,
        issues: [],
        evidence: [{
          sourceId: 'daily_sales.revenue',
          tables: ['daily_sales'],
          rowCount: 2,
          kind: 'actual',
        }],
      },
      metrics: [],
      narrative: ['Existen datos contradictorios.'],
    }],
  }
}
