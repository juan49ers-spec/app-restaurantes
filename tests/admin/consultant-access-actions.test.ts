import { beforeEach, describe, expect, it, vi } from 'vitest'

type QueryResult = { data: unknown; error: { message: string } | null }

const CONSULTANT_ID = '11111111-1111-4111-8111-111111111111'
const RESTAURANT_ID = '22222222-2222-4222-8222-222222222222'
const RELATIONSHIP_ID = '33333333-3333-4333-8333-333333333333'

let calls: Array<{
  table: string
  operation: 'upsert' | 'update'
  value: Record<string, unknown>
  options?: Record<string, unknown>
  filters: Array<['eq', string, unknown]>
}> = []

class MockQuery {
  private filters: Array<['eq', string, unknown]> = []

  constructor(
    private readonly table: string,
    private readonly operation: 'upsert' | 'update',
    private readonly value: Record<string, unknown>,
    private readonly options?: Record<string, unknown>,
  ) {}

  eq(column: string, value: unknown) {
    this.filters.push(['eq', column, value])
    return this
  }

  then(resolve: (value: QueryResult) => unknown, reject?: (reason?: unknown) => unknown) {
    calls.push({
      table: this.table,
      operation: this.operation,
      value: this.value,
      options: this.options,
      filters: this.filters,
    })
    return Promise.resolve({ data: null, error: null }).then(resolve, reject)
  }
}

const mockSupabase = {
  from: vi.fn((table: string) => ({
    upsert: (value: Record<string, unknown>, options?: Record<string, unknown>) =>
      new MockQuery(table, 'upsert', value, options),
    update: (value: Record<string, unknown>) => new MockQuery(table, 'update', value),
  })),
}

vi.mock('@/lib/supabaseServer', () => ({
  createClient: vi.fn(async () => mockSupabase),
}))

vi.mock('@/app/actions/admin-queries', () => ({
  requireAdmin: vi.fn(async () => ({ id: 'admin-user' })),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('admin consultant access actions', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    calls = []
  })

  it('upserts a consultant restaurant relationship with admin-only server validation', async () => {
    const { upsertConsultantRestaurantAccess } = await import('@/app/actions/admin')

    const result = await upsertConsultantRestaurantAccess({
      consultantUserId: CONSULTANT_ID,
      restaurantId: RESTAURANT_ID,
      role: 'CONSULTANT',
      status: 'ACTIVE',
    })

    expect(result).toEqual({ success: true })
    expect(calls).toEqual([{
      table: 'consultant_restaurants',
      operation: 'upsert',
      value: {
        consultant_user_id: CONSULTANT_ID,
        restaurant_id: RESTAURANT_ID,
        role: 'CONSULTANT',
        status: 'ACTIVE',
      },
      options: { onConflict: 'consultant_user_id,restaurant_id' },
      filters: [],
    }])
  })

  it('rejects invalid consultant relationship input before writing', async () => {
    const { upsertConsultantRestaurantAccess } = await import('@/app/actions/admin')

    const result = await upsertConsultantRestaurantAccess({
      consultantUserId: 'invalid',
      restaurantId: RESTAURANT_ID,
      role: 'CONSULTANT',
      status: 'ACTIVE',
    })

    expect(result).toEqual({ success: false, error: 'Datos de acceso inválidos.' })
    expect(calls).toEqual([])
  })

  it('updates only the requested consultant relationship status', async () => {
    const { updateConsultantRestaurantAccessStatus } = await import('@/app/actions/admin')

    const result = await updateConsultantRestaurantAccessStatus({
      id: RELATIONSHIP_ID,
      status: 'REVOKED',
    })

    expect(result).toEqual({ success: true })
    expect(calls).toEqual([{
      table: 'consultant_restaurants',
      operation: 'update',
      value: { status: 'REVOKED' },
      options: undefined,
      filters: [['eq', 'id', RELATIONSHIP_ID]],
    }])
  })
})
