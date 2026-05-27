export type InvoicesCsvRowStatus = 'valid' | 'invalid'

export interface InvoicesCsvPayload {
  date: string
  supplier_id?: string
  supplier_name?: string
  invoice_number: string
  total_amount: number
  tax_amount?: number
}

export interface InvoicesCsvPreviewRow {
  rowNumber: number
  status: InvoicesCsvRowStatus
  payload?: InvoicesCsvPayload
  errors: string[]
}

export interface InvoicesCsvDuplicate {
  key: string
  rowNumbers: number[]
}

export interface InvoicesCsvPreview {
  totalRows: number
  validRows: number
  invalidRows: number
  fileErrors: string[]
  duplicates: InvoicesCsvDuplicate[]
  summary: {
    totalAmount: number
    taxAmount: number
    dateFrom: string | null
    dateTo: string | null
    supplierRefs: number
  }
  rows: InvoicesCsvPreviewRow[]
}

export const INVOICES_CSV_TEMPLATE = [
  'date;supplier_name;invoice_number;total_amount;tax_amount',
  '2026-02-01;Proveedor Ejemplo;F-2026-001;345,67;31,42',
].join('\n')

const REQUIRED_HEADERS = ['date', 'invoice_number', 'total_amount']

export function parseInvoicesCsvPreview(input: { csvText: string }): InvoicesCsvPreview {
  const lines = input.csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0)

  const delimiter = detectDelimiter(lines[0] ?? '')
  const headers = parseCsvLine(lines[0] ?? '', delimiter).map(normalizeHeader)
  const fileErrors = [
    ...REQUIRED_HEADERS
      .filter(header => !headers.includes(header))
      .map(header => `Falta la columna obligatoria ${header}.`),
    ...(!headers.includes('supplier_id') && !headers.includes('supplier_name')
      ? ['Falta supplier_id o supplier_name para identificar al proveedor.']
      : []),
  ]

  const rows = lines.slice(1).map((line, index) => {
    const rowNumber = index + 2
    const values = parseCsvLine(line, delimiter)
    const rawRow = Object.fromEntries(headers.map((header, valueIndex) => [header, values[valueIndex]?.trim() ?? '']))

    if (fileErrors.length > 0) {
      return invalidRow(rowNumber, ['No se puede validar la fila porque faltan columnas obligatorias.'])
    }

    return parseInvoiceRow(rowNumber, rawRow)
  })

  const validRows = rows.filter(isValidPreviewRow)
  const dates = validRows.map(row => row.payload.date).sort()
  const supplierRefs = new Set(validRows.map(row => supplierRefKey(row.payload)))

  return {
    totalRows: rows.length,
    validRows: validRows.length,
    invalidRows: rows.filter(row => row.status === 'invalid').length,
    fileErrors,
    duplicates: findDuplicates(rows),
    summary: {
      totalAmount: roundMoney(sum(validRows.map(row => row.payload.total_amount))),
      taxAmount: roundMoney(sum(validRows.map(row => row.payload.tax_amount ?? 0))),
      dateFrom: dates[0] ?? null,
      dateTo: dates[dates.length - 1] ?? null,
      supplierRefs: supplierRefs.size,
    },
    rows,
  }
}

function parseInvoiceRow(rowNumber: number, rawRow: Record<string, string>): InvoicesCsvPreviewRow {
  const errors: string[] = []
  const date = parseDate(rawRow.date)
  const supplierId = rawRow.supplier_id?.trim()
  const supplierName = rawRow.supplier_name?.trim()
  const invoiceNumber = rawRow.invoice_number?.trim()
  const totalAmount = parseNumber(rawRow.total_amount)
  const taxAmount = rawRow.tax_amount?.trim() ? parseNumber(rawRow.tax_amount) : undefined

  if (!date) errors.push('Fecha inválida en date. Usa formato YYYY-MM-DD.')
  if (!supplierId && !supplierName) errors.push('Indica supplier_id o supplier_name.')
  if (supplierId && !isUuid(supplierId)) errors.push('supplier_id debe ser un UUID válido.')
  if (!invoiceNumber) errors.push('invoice_number es obligatorio.')
  if (totalAmount === null || totalAmount < 0) errors.push('total_amount debe ser un número positivo o cero.')
  if (taxAmount === null || (typeof taxAmount === 'number' && taxAmount < 0)) errors.push('tax_amount debe ser un número positivo o cero.')

  if (errors.length > 0 || !date || !invoiceNumber || totalAmount === null || taxAmount === null) {
    return invalidRow(rowNumber, errors)
  }

  const payload: InvoicesCsvPayload = {
    date,
    invoice_number: invoiceNumber,
    total_amount: totalAmount,
  }

  if (supplierId) payload.supplier_id = supplierId
  if (supplierName) payload.supplier_name = supplierName
  if (typeof taxAmount === 'number') payload.tax_amount = taxAmount

  return validRow(rowNumber, payload)
}

function detectDelimiter(headerLine: string) {
  return (headerLine.match(/;/g)?.length ?? 0) > (headerLine.match(/,/g)?.length ?? 0) ? ';' : ','
}

function parseCsvLine(line: string, delimiter: string) {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"' && next === '"') {
      current += '"'
      index += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === delimiter && !inQuotes) {
      values.push(current)
      current = ''
      continue
    }

    current += char
  }

  values.push(current)
  return values
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase()
}

function parseDate(value: string | undefined) {
  const clean = value?.trim()
  return clean && /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : null
}

function parseNumber(value: string | undefined) {
  const clean = value?.trim()
  if (!clean) return null

  const normalized = clean.includes(',')
    ? clean.replace(/\./g, '').replace(',', '.')
    : clean

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function validRow(rowNumber: number, payload: InvoicesCsvPayload): InvoicesCsvPreviewRow {
  return { rowNumber, status: 'valid', payload, errors: [] }
}

function invalidRow(rowNumber: number, errors: string[]): InvoicesCsvPreviewRow {
  return { rowNumber, status: 'invalid', errors }
}

function isValidPreviewRow(
  row: InvoicesCsvPreviewRow,
): row is InvoicesCsvPreviewRow & { status: 'valid'; payload: InvoicesCsvPayload } {
  return row.status === 'valid' && row.payload !== undefined
}

function findDuplicates(rows: InvoicesCsvPreviewRow[]) {
  const rowNumbersByKey = new Map<string, number[]>()

  for (const row of rows) {
    if (row.status !== 'valid' || !row.payload) continue
    const key = duplicateKey(row.payload)
    rowNumbersByKey.set(key, [...(rowNumbersByKey.get(key) ?? []), row.rowNumber])
  }

  return [...rowNumbersByKey.entries()]
    .filter(([, rowNumbers]) => rowNumbers.length > 1)
    .map(([key, rowNumbers]) => ({ key, rowNumbers }))
}

function duplicateKey(payload: InvoicesCsvPayload) {
  return [
    supplierRefKey(payload),
    payload.invoice_number.trim().toLowerCase(),
    payload.date,
    payload.total_amount,
  ].join('|')
}

function supplierRefKey(payload: InvoicesCsvPayload) {
  return payload.supplier_id
    ? `id:${payload.supplier_id}`
    : `name:${normalizeSupplierName(payload.supplier_name ?? '')}`
}

function normalizeSupplierName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}
