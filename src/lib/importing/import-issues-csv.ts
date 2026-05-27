type ImportIssueRow = {
  rowNumber: number
  status: string
  errors: string[]
}

type ImportDuplicate = {
  key: string
  rowNumbers: number[]
}

export function buildImportIssuesCsv(input: {
  fileErrors: string[]
  duplicates: ImportDuplicate[]
  rows: ImportIssueRow[]
}) {
  const rows = [
    ['type', 'row', 'key', 'message'],
    ...input.fileErrors.map(error => ['file', '', '', error]),
    ...input.duplicates.map(duplicate => [
      'duplicate',
      duplicate.rowNumbers.join(', '),
      duplicate.key,
      'Duplicado interno.',
    ]),
    ...input.rows
      .filter(row => row.status === 'invalid')
      .flatMap(row => row.errors.map(error => ['row', String(row.rowNumber), '', error])),
  ]

  return rows
    .map((row, rowIndex) => row.map((value, columnIndex) => escapeCsvValue(value, rowIndex > 0 && (columnIndex === 2 || columnIndex === 3))).join(';'))
    .join('\n')
}

export function buildImportIssuesHref(input: Parameters<typeof buildImportIssuesCsv>[0]) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(buildImportIssuesCsv(input))}`
}

function escapeCsvValue(value: string, forceQuotes = false) {
  if (!value) return ''
  if (!forceQuotes && !/[;,"\n\r]/.test(value)) return value
  return `"${value.replace(/"/g, '""')}"`
}
