import { beforeEach, describe, expect, it, vi } from 'vitest'

type QueryResult = { data: unknown; error: { message: string } | null }
type Filter = ['eq', string, unknown]

const USER_ID = '99999999-9999-4999-8999-999999999999'
const ACTIVE_RESTAURANT_ID = '11111111-1111-4111-8111-111111111111'
const LINKED_RESTAURANT_ID = '22222222-2222-4222-8222-222222222222'

let calls: Array<{
  table: string
  select?: string
  filters: Filter[]
  insertValue?: Record<string, unknown>
}> = []
let cookieWrites: Array<{ name: string; value: string }> = []
let ownedRestaurants: unknown[] = []
let linkedRestaurants: unknown[] = []
let allowOwnedSelection = false
let allowLinkedSelection = false

class MockQuery {
  private filters: Filter[] = []
  private selectValue?: string

  constructor(
    private readonly table: string,
    private readonly operation: 'select' | 'insert' = 'select',
    private readonly mutationValue?: Record<string, unknown>,
  ) {}

  select(value?: string) {
    this.selectValue = value
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push(['eq', column, value])
    return this
  }

  insert(value: Record<string, unknown>) {
    return new MockQuery(this.table, 'insert', value)
  }

  maybeSingle() {
    return Promise.resolve(this.resolveSingle())
  }

  then(resolve: (value: QueryResult) => unknown, reject?: (reason?: unknown) => unknown) {
    return Promise.resolve(this.resolveMany()).then(resolve, reject)
  }

  private resolveMany(): QueryResult {
    calls.push({
      table: this.table,
      select: this.selectValue,
      filters: this.filters,
      insertValue: this.operation === 'insert' ? this.mutationValue : undefined,
    })
    if (this.operation === 'insert') return { data: this.mutationValue ?? null, error: null }
    if (this.table === 'restaurants') return { data: ownedRestaurants, error: null }
    if (this.table === 'consultant_restaurants') return { data: linkedRestaurants, error: null }
    return { data: [], error: null }
  }

  private resolveSingle(): QueryResult {
    calls.push({
      table: this.table,
      select: this.selectValue,
      filters: this.filters,
      insertValue: this.operation === 'insert' ? this.mutationValue : undefined,
    })
    if (this.table === 'restaurants' && allowOwnedSelection) {
      return { data: { id: ACTIVE_RESTAURANT_ID }, error: null }
    }
    if (this.table === 'consultant_restaurants' && allowLinkedSelection) {
      return { data: { restaurant_id: LINKED_RESTAURANT_ID }, error: null }
    }
    return { data: null, error: null }
  }
}

const mockSupabase = {
  auth: {
    getUser: vi.fn(async () => ({
      data: { user: { id: USER_ID, email: 'consultor@controlhub.es' } },
      error: null,
    })),
  },
  from: vi.fn((table: string) => new MockQuery(table)),
}

vi.mock('@/lib/supabaseServer', () => ({
  createClient: vi.fn(async () => mockSupabase),
}))

vi.mock('@/app/actions/utils', () => ({
  getUserRestaurant: vi.fn(async () => ACTIVE_RESTAURANT_ID),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    set: (name: string, value: string) => cookieWrites.push({ name, value }),
  })),
}))

describe('consultant portfolio actions', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    calls = []
    cookieWrites = []
    allowOwnedSelection = false
    allowLinkedSelection = false
    ownedRestaurants = [{
      id: ACTIVE_RESTAURANT_ID,
      name: 'Txiquita Tasca',
      consultant_name: 'ControlHub',
    }]
    linkedRestaurants = [{
      restaurant_id: LINKED_RESTAURANT_ID,
      role: 'CONSULTANT',
      status: 'ACTIVE',
      restaurants: {
        id: LINKED_RESTAURANT_ID,
        name: 'La Chamaca',
        consultant_name: null,
      },
    }]
  })

  it('loads the consultant portfolio scoped to the authenticated user', async () => {
    const { getConsultantPortfolio } = await import('@/app/actions/consultant')

    const result = await getConsultantPortfolio()

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
    expect(result.data?.map(client => client.restaurantId)).toEqual([
      LINKED_RESTAURANT_ID,
      ACTIVE_RESTAURANT_ID,
    ])
    expect(calls).toEqual(expect.arrayContaining([
      expect.objectContaining({
        table: 'restaurants',
        filters: expect.arrayContaining([['eq', 'owner_id', USER_ID]]),
      }),
      expect.objectContaining({
        table: 'consultant_restaurants',
        filters: expect.arrayContaining([
          ['eq', 'consultant_user_id', USER_ID],
          ['eq', 'status', 'ACTIVE'],
        ]),
      }),
    ]))
  })

  it('selects a linked client by setting the server-side active client cookie', async () => {
    allowLinkedSelection = true
    const { selectConsultantClient } = await import('@/app/actions/consultant')

    const result = await selectConsultantClient({ restaurantId: LINKED_RESTAURANT_ID })

    expect(result).toEqual({ success: true, data: { restaurantId: LINKED_RESTAURANT_ID } })
    expect(cookieWrites).toEqual([{
      name: 'active_consultant_restaurant_id',
      value: LINKED_RESTAURANT_ID,
    }])
    expect(calls.find(item =>
      item.table === 'admin_audit_log' &&
      item.insertValue?.action === 'consultant.select_client'
    )?.insertValue).toEqual(expect.objectContaining({
      actor_user_id: USER_ID,
      action: 'consultant.select_client',
      target_type: 'restaurant',
      target_id: LINKED_RESTAURANT_ID,
      metadata: expect.objectContaining({ restaurant_id: LINKED_RESTAURANT_ID }),
    }))
  })

  it('rejects selecting a restaurant outside the consultant portfolio', async () => {
    const { selectConsultantClient } = await import('@/app/actions/consultant')

    const result = await selectConsultantClient({ restaurantId: LINKED_RESTAURANT_ID })

    expect(result).toEqual({ success: false, error: 'No tienes acceso a este restaurante.' })
    expect(cookieWrites).toEqual([])
  })
})
