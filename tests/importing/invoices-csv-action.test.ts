import { beforeEach, describe, expect, it, vi } from 'vitest'

const RESTAURANT_ID = '550e8400-e29b-41d4-a716-446655440000'
const SUPPLIER_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_SUPPLIER_ID = '22222222-2222-4222-8222-222222222222'

let mockRestaurantId: string | null = RESTAURANT_ID
let mockUser: { id: string } | null = { id: 'user-1' }
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

  order() {
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
    auth: {
      getUser: vi.fn(async () => ({ data: { user: mockUser } })),
    },
    from: (table: string) => new MockQuery(table),
  }),
}))

vi.mock('@/app/actions/utils', () => ({
  getUserRestaurant: vi.fn(async () => mockRestaurantId),
}))

vi.mock('@/services/openai-vision', () => ({
  scanInvoiceWithGPT4o: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('invoices CSV actions', () => {
  beforeEach(() => {
    vi.resetModules()
    mockRestaurantId = RESTAURANT_ID
    mockUser = { id: 'user-1' }
    selectResults = {
      suppliers: [{ id: SUPPLIER_ID, name: 'Proveedor Ejemplo' }],
      invoices: [],
    }
    selectErrors = {}
    mutationError = null
    calls = []
  })

  it('imports invoice headers scoped to the active restaurant without stock or expense writes', async () => {
    const { importInvoicesCsv } = await import('@/app/actions/invoices')

    const result = await importInvoicesCsv({
      csvText: 'date;supplier_name;invoice_number;total_amount;tax_amount\n2026-02-01;Proveedor Ejemplo;F-001;345,67;31,42',
    })

    expect(result).toEqual({
      success: true,
      data: {
        importedRows: 1,
        summary: {
          totalAmount: 345.67,
          taxAmount: 31.42,
          dateFrom: '2026-02-01',
          dateTo: '2026-02-01',
          supplierRefs: 1,
        },
      },
    })
    expect(calls.map(call => call.table)).toEqual(['suppliers', 'invoices', 'invoices'])
    expect(calls[0]).toMatchObject({
      table: 'suppliers',
      operation: 'select',
      filters: [['eq', 'restaurant_id', RESTAURANT_ID]],
    })
    expect(calls[1]).toMatchObject({
      table: 'invoices',
      operation: 'select',
      filters: expect.arrayContaining([
        ['eq', 'restaurant_id', RESTAURANT_ID],
        ['in', 'supplier_id', [SUPPLIER_ID]],
        ['in', 'invoice_number', ['F-001']],
        ['in', 'date', ['2026-02-01']],
      ]),
    })
    expect(calls[2]).toMatchObject({
      table: 'invoices',
      operation: 'insert',
    })
    expect(calls[2].rows).toEqual([
      expect.objectContaining({
        restaurant_id: RESTAURANT_ID,
        supplier_id: SUPPLIER_ID,
        invoice_number: 'F-001',
        date: '2026-02-01',
        total_amount: 345.67,
        status: 'completed',
        file_url: null,
      }),
    ])
    expect(calls.some(call => call.table === 'stock_movements')).toBe(false)
    expect(calls.some(call => call.table === 'operating_expenses')).toBe(false)
  })

  it('blocks unknown suppliers before writing', async () => {
    selectResults.suppliers = []
    const { importInvoicesCsv } = await import('@/app/actions/invoices')

    const result = await importInvoicesCsv({
      csvText: 'date;supplier_name;invoice_number;total_amount\n2026-02-01;Proveedor Ejemplo;F-001;345,67',
    })

    expect(result).toEqual({
      success: false,
      error: 'El CSV contiene proveedores que no existen en este restaurante.',
    })
    expect(calls.some(call => call.operation === 'insert')).toBe(false)
  })

  it('preflights existing invoices by exact supplier invoice date and total', async () => {
    selectResults.invoices = [{ supplier_id: SUPPLIER_ID, invoice_number: 'F-001', date: '2026-02-01', total_amount: 345.67 }]
    const { validateInvoicesCsvImport } = await import('@/app/actions/invoices')

    const result = await validateInvoicesCsvImport({
      csvText: 'date;supplier_id;invoice_number;total_amount\n2026-02-01;11111111-1111-4111-8111-111111111111;F-001;345,67',
    })

    expect(result.success).toBe(true)
    expect(result.data?.canImport).toBe(false)
    expect(result.data?.existingRows).toEqual([
      {
        key: `${SUPPLIER_ID}|f-001|2026-02-01|345.67`,
        rowNumbers: [2],
        message: 'Ya existe la factura F-001 de Proveedor Ejemplo (2026-02-01).',
      },
    ])
  })

  it('ignores existing invoices that do not match an exact CSV key', async () => {
    selectResults.suppliers = [
      { id: SUPPLIER_ID, name: 'Proveedor Ejemplo' },
      { id: OTHER_SUPPLIER_ID, name: 'Otro Proveedor' },
    ]
    selectResults.invoices = [{ supplier_id: SUPPLIER_ID, invoice_number: 'F-002', date: '2026-02-02', total_amount: 100 }]
    const { validateInvoicesCsvImport } = await import('@/app/actions/invoices')

    const result = await validateInvoicesCsvImport({
      csvText: [
        'date;supplier_id;invoice_number;total_amount',
        `2026-02-01;${SUPPLIER_ID};F-001;345,67`,
        `2026-02-02;${OTHER_SUPPLIER_ID};F-002;100`,
      ].join('\n'),
    })

    expect(result.success).toBe(true)
    expect(result.data?.canImport).toBe(true)
    expect(result.data?.existingRows).toEqual([])
  })

  it('loads invoices scoped to the active restaurant', async () => {
    const { getInvoices } = await import('@/app/actions/invoices')

    await getInvoices()

    expect(calls[0]).toMatchObject({
      table: 'invoices',
      operation: 'select',
      filters: [['eq', 'restaurant_id', RESTAURANT_ID]],
    })
  })
})
