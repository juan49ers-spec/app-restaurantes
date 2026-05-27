import { describe, expect, it } from 'vitest'
import { parseInvoicesCsvPreview } from '@/lib/importing/invoices-csv'

describe('parseInvoicesCsvPreview', () => {
  it('parses invoice headers with Spanish amounts and summary', () => {
    const preview = parseInvoicesCsvPreview({
      csvText: [
        'date;supplier_name;invoice_number;total_amount;tax_amount',
        '2026-02-01;Proveedor Ejemplo;F-001;1.234,56;112,23',
        '2026-02-02;Proveedor Ejemplo;F-002;900;81,82',
      ].join('\n'),
    })

    expect(preview.validRows).toBe(2)
    expect(preview.invalidRows).toBe(0)
    expect(preview.summary).toEqual({
      totalAmount: 2134.56,
      taxAmount: 194.05,
      dateFrom: '2026-02-01',
      dateTo: '2026-02-02',
      supplierRefs: 1,
    })
  })

  it('detects duplicate invoice rows by supplier invoice date and total', () => {
    const preview = parseInvoicesCsvPreview({
      csvText: [
        'date;supplier_name;invoice_number;total_amount',
        '2026-02-01;Proveedor Ejemplo;F-001;345,67',
        '2026-02-01;proveedor   ejemplo;F-001;345,67',
      ].join('\n'),
    })

    expect(preview.duplicates).toEqual([
      {
        key: 'name:proveedor ejemplo|f-001|2026-02-01|345.67',
        rowNumbers: [2, 3],
      },
    ])
  })

  it('requires supplier reference and positive amounts', () => {
    const preview = parseInvoicesCsvPreview({
      csvText: [
        'date;invoice_number;total_amount',
        '2026-02-01;F-001;-1',
      ].join('\n'),
    })

    expect(preview.fileErrors).toContain('Falta supplier_id o supplier_name para identificar al proveedor.')
    expect(preview.validRows).toBe(0)
    expect(preview.invalidRows).toBe(1)
  })
})
