import { describe, expect, it } from 'vitest'
import { buildImportIssuesCsv } from '@/lib/importing/import-issues-csv'

describe('buildImportIssuesCsv', () => {
  it('exports file errors, invalid rows and duplicates as a spreadsheet-friendly csv', () => {
    const csv = buildImportIssuesCsv({
      fileErrors: ['Falta la columna obligatoria date.'],
      duplicates: [{ key: '2026-02-01', rowNumbers: [2, 4] }],
      rows: [
        { rowNumber: 3, status: 'invalid', errors: ['Importe inválido.'] },
        { rowNumber: 5, status: 'valid', errors: [] },
      ],
    })

    expect(csv).toContain('type;row;key;message')
    expect(csv).toContain('file;;;"Falta la columna obligatoria date."')
    expect(csv).toContain('duplicate;"2, 4";"2026-02-01";"Duplicado interno."')
    expect(csv).toContain('row;3;;"Importe inválido."')
  })
})
