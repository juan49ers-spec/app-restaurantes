import { beforeEach, describe, expect, it, vi } from 'vitest'

const RESTAURANT_ID = '550e8400-e29b-41d4-a716-446655440000'
const EMPLOYEE_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_EMPLOYEE_ID = '22222222-2222-4222-8222-222222222222'

let mockRestaurantId: string | null = RESTAURANT_ID
let selectResults: Record<string, unknown[]> = {}
let selectErrors: Record<string, { message: string }> = {}
let mutationError: { message: string } | null = null
let calls: Array<{
  table: string
  operation: 'select' | 'insert'
  rows: unknown[]
  filters: Array<[string, string, unknown]>
}> = []

class MockQuery {
  private operation: 'select' | 'insert' | null = null
  private rows: unknown[] = []
  private filters: Array<[string, string, unknown]> = []

  constructor(private readonly table: string) {}

  select() {
    if (!this.operation) this.operation = 'select'
    return this
  }

  insert(rows: unknown[]) {
    this.operation = 'insert'
    this.rows = rows
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push(['eq', column, value])
    return this
  }

  in(column: string, value: unknown[]) {
    this.filters.push(['in', column, value])
    return this
  }

  then(resolve: (value: { data: unknown[] | null; error: { message: string } | null }) => unknown) {
    if (!this.operation) throw new Error('No operation called')
    calls.push({
      table: this.table,
      operation: this.operation,
      rows: this.rows,
      filters: this.filters,
    })

    if (this.operation === 'select') {
      if (selectErrors[this.table]) {
        return Promise.resolve({ data: null, error: selectErrors[this.table] }).then(resolve)
      }

      return Promise.resolve({ data: selectResults[this.table] ?? [], error: null }).then(resolve)
    }

    return Promise.resolve({
      data: mutationError ? null : this.rows,
      error: mutationError,
    }).then(resolve)
  }
}

vi.mock('@/lib/supabaseServer', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (table: string) => new MockQuery(table),
  }),
}))

vi.mock('@/app/actions/utils', () => ({
  getUserRestaurant: vi.fn(async () => mockRestaurantId),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('shifts CSV actions', () => {
  beforeEach(() => {
    vi.resetModules()
    mockRestaurantId = RESTAURANT_ID
    selectResults = {
      employees: [{ id: EMPLOYEE_ID, first_name: 'Maria', last_name: 'Lopez', hourly_rate: 12, status: 'ACTIVE' }],
      shifts: [],
    }
    selectErrors = {}
    mutationError = null
    calls = []
  })

  it('imports valid shifts scoped to the active restaurant and calculates estimated cost', async () => {
    const { importShiftsCsv } = await import('@/app/actions/staff')

    const result = await importShiftsCsv({
      csvText: 'date;employee_name;start_time;end_time;break_minutes;shift_type;status\n2026-02-01;Maria Lopez;09:00;17:00;30;ALMUERZO;scheduled',
    })

    expect(result).toEqual({
      success: true,
      data: {
        importedRows: 1,
        summary: {
          totalShifts: 1,
          totalHours: 7.5,
          dateFrom: '2026-02-01',
          dateTo: '2026-02-01',
          employeeRefs: 1,
        },
      },
    })
    expect(calls[0]).toMatchObject({
      table: 'employees',
      operation: 'select',
      filters: [['eq', 'restaurant_id', RESTAURANT_ID]],
    })
    expect(calls[1]).toMatchObject({
      table: 'shifts',
      operation: 'select',
      filters: expect.arrayContaining([
        ['eq', 'restaurant_id', RESTAURANT_ID],
        ['in', 'date', ['2026-02-01']],
        ['in', 'employee_id', [EMPLOYEE_ID]],
      ]),
    })
    expect(calls[2]).toMatchObject({
      table: 'shifts',
      operation: 'insert',
    })
    expect(calls[2].rows).toEqual([
      expect.objectContaining({
        restaurant_id: RESTAURANT_ID,
        employee_id: EMPLOYEE_ID,
        date: '2026-02-01',
        start_time: '09:00',
        end_time: '17:00',
        break_minutes: 30,
        shift_type: 'ALMUERZO',
        status: 'scheduled',
        estimated_cost: 90,
      }),
    ])
  })

  it('blocks unknown employees before writing', async () => {
    selectResults.employees = []
    const { importShiftsCsv } = await import('@/app/actions/staff')

    const result = await importShiftsCsv({
      csvText: 'date;employee_name;start_time;end_time\n2026-02-01;Maria Lopez;09:00;17:00',
    })

    expect(result).toEqual({
      success: false,
      error: 'El CSV contiene empleados que no existen en este restaurante.',
    })
    expect(calls.some(call => call.operation === 'insert')).toBe(false)
  })

  it('blocks ambiguous employee names before writing', async () => {
    selectResults.employees = [
      { id: EMPLOYEE_ID, first_name: 'Maria', last_name: 'Lopez', hourly_rate: 12, status: 'ACTIVE' },
      { id: OTHER_EMPLOYEE_ID, first_name: 'Maria', last_name: 'Lopez', hourly_rate: 10, status: 'ACTIVE' },
    ]
    const { importShiftsCsv } = await import('@/app/actions/staff')

    const result = await importShiftsCsv({
      csvText: 'date;employee_name;start_time;end_time\n2026-02-01;Maria Lopez;09:00;17:00',
    })

    expect(result).toEqual({
      success: false,
      error: 'El CSV contiene nombres de empleado ambiguos. Usa employee_id para esos turnos.',
    })
    expect(calls.some(call => call.operation === 'insert')).toBe(false)
  })

  it('preflights existing shifts by exact employee date and time', async () => {
    selectResults.shifts = [{ employee_id: EMPLOYEE_ID, date: '2026-02-01', start_time: '09:00', end_time: '17:00' }]
    const { validateShiftsCsvImport } = await import('@/app/actions/staff')

    const result = await validateShiftsCsvImport({
      csvText: 'date;employee_id;start_time;end_time\n2026-02-01;11111111-1111-4111-8111-111111111111;09:00;17:00',
    })

    expect(result.success).toBe(true)
    expect(result.data?.canImport).toBe(false)
    expect(result.data?.existingRows).toEqual([
      {
        key: `${'2026-02-01'}|${EMPLOYEE_ID}|09:00|17:00`,
        rowNumbers: [2],
        message: 'Ya existe turno para Maria Lopez el 2026-02-01 de 09:00 a 17:00.',
      },
    ])
  })

  it('ignores existing shifts that do not match an exact CSV pair', async () => {
    selectResults.employees = [
      { id: EMPLOYEE_ID, first_name: 'Maria', last_name: 'Lopez', hourly_rate: 12, status: 'ACTIVE' },
      { id: OTHER_EMPLOYEE_ID, first_name: 'Juan', last_name: 'Garcia', hourly_rate: 10, status: 'ACTIVE' },
    ]
    selectResults.shifts = [{ employee_id: EMPLOYEE_ID, date: '2026-02-02', start_time: '09:00', end_time: '17:00' }]
    const { validateShiftsCsvImport } = await import('@/app/actions/staff')

    const result = await validateShiftsCsvImport({
      csvText: [
        'date;employee_id;start_time;end_time',
        `2026-02-01;${EMPLOYEE_ID};09:00;17:00`,
        `2026-02-02;${OTHER_EMPLOYEE_ID};10:00;18:00`,
      ].join('\n'),
    })

    expect(result.success).toBe(true)
    expect(result.data?.canImport).toBe(true)
    expect(result.data?.existingRows).toEqual([])
  })

  it('returns a controlled error when duplicate preflight fails', async () => {
    selectErrors.shifts = { message: 'timeout' }
    const { validateShiftsCsvImport } = await import('@/app/actions/staff')

    const result = await validateShiftsCsvImport({
      csvText: 'date;employee_name;start_time;end_time\n2026-02-01;Maria Lopez;09:00;17:00',
    })

    expect(result).toEqual({
      success: false,
      error: 'No se pudieron comprobar duplicados existentes. Inténtalo de nuevo antes de importar.',
    })
  })
})
