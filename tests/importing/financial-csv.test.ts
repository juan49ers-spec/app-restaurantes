import { describe, expect, it } from 'vitest'
import { parseFinancialCsvPreview } from '@/lib/importing/financial-csv'

describe('parseFinancialCsvPreview', () => {
  it('parses sales CSV with Spanish decimal amounts and detects duplicate dates', () => {
    const csv = [
      'date;revenue_total;total_covers;labor_hours',
      '2026-02-01;1.234,56;78;12,5',
      '2026-02-01;900;55;8',
      '2026-02-02;0;0;0',
    ].join('\n')

    const result = parseFinancialCsvPreview({ kind: 'sales', csvText: csv })

    expect(result.kind).toBe('sales')
    expect(result.totalRows).toBe(3)
    expect(result.validRows).toBe(3)
    expect(result.invalidRows).toBe(0)
    expect(result.duplicates).toEqual([
      {
        key: '2026-02-01',
        rowNumbers: [2, 3],
      },
    ])
    expect(result.rows[0]).toMatchObject({
      rowNumber: 2,
      status: 'valid',
      payload: {
        date: '2026-02-01',
        revenue_total: 1234.56,
        total_covers: 78,
        labor_hours: 12.5,
      },
    })
    expect(result.summary).toEqual({
      totalRevenue: 2134.56,
      totalExpenses: 0,
      dateFrom: '2026-02-01',
      dateTo: '2026-02-02',
    })
  })

  it('rejects expenses CSV rows with invalid categories and keeps valid rows', () => {
    const csv = [
      'expense_date,category,amount,description,payment_method',
      '2026-02-01,PROVEEDORES_COMIDA,345.67,Factura pescado,bank',
      '2026-02-02,CATEGORIA_MALA,120,Error,cash',
    ].join('\n')

    const result = parseFinancialCsvPreview({ kind: 'expenses', csvText: csv })

    expect(result.kind).toBe('expenses')
    expect(result.totalRows).toBe(2)
    expect(result.validRows).toBe(1)
    expect(result.invalidRows).toBe(1)
    expect(result.rows[0]).toMatchObject({
      rowNumber: 2,
      status: 'valid',
      payload: {
        expense_date: '2026-02-01',
        category: 'PROVEEDORES_COMIDA',
        amount: 345.67,
        description: 'Factura pescado',
        payment_method: 'bank',
      },
    })
    expect(result.rows[1]).toMatchObject({
      rowNumber: 3,
      status: 'invalid',
      errors: ['Categoría de gasto no reconocida: CATEGORIA_MALA.'],
    })
    expect(result.summary).toEqual({
      totalRevenue: 0,
      totalExpenses: 345.67,
      dateFrom: '2026-02-01',
      dateTo: '2026-02-01',
    })
  })

  it('returns a clear error when required headers are missing', () => {
    const result = parseFinancialCsvPreview({
      kind: 'sales',
      csvText: 'date;total_covers\n2026-02-01;20',
    })

    expect(result.totalRows).toBe(1)
    expect(result.validRows).toBe(0)
    expect(result.invalidRows).toBe(1)
    expect(result.fileErrors).toEqual(['Falta la columna obligatoria revenue_total.'])
    expect(result.rows[0]).toMatchObject({
      rowNumber: 2,
      status: 'invalid',
      errors: ['No se puede validar la fila porque faltan columnas obligatorias.'],
    })
  })
})
