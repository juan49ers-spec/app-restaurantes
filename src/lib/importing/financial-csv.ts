import { OperatingExpenseCategorySchema } from '@/types/schema'
import type { OperatingExpenseCategory } from '@/types/schema'

export type FinancialCsvKind = 'sales' | 'expenses'
export type FinancialCsvRowStatus = 'valid' | 'invalid'

export interface SalesCsvPayload {
  date: string
  revenue_total: number
  base_10?: number
  tax_10?: number
  base_21?: number
  tax_21?: number
  revenue_dine_in?: number
  revenue_takeout?: number
  revenue_delivery?: number
  total_covers?: number
  labor_hours?: number
  cost_of_goods?: number
  labor_cost?: number
  day_status?: 'OPEN' | 'CLOSED' | 'LOCKED'
}

export interface ExpenseCsvPayload {
  expense_date: string
  category: OperatingExpenseCategory
  amount: number
  description?: string
  provider_detail?: string
  tag?: string
  payment_method?: 'bank' | 'cash' | 'card' | 'transfer' | 'other'
  recurrence?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  is_paid?: boolean
  taxable_amount?: number
  tax_rate?: number
  tax_amount?: number
  withholding_rate?: number
  withholding_amount?: number
  is_professional_invoice?: boolean
}

export interface FinancialCsvPreviewRow {
  rowNumber: number
  status: FinancialCsvRowStatus
  payload?: SalesCsvPayload | ExpenseCsvPayload
  errors: string[]
}

export interface FinancialCsvDuplicate {
  key: string
  rowNumbers: number[]
}

export interface FinancialCsvPreview {
  kind: FinancialCsvKind
  totalRows: number
  validRows: number
  invalidRows: number
  fileErrors: string[]
  duplicates: FinancialCsvDuplicate[]
  summary: {
    totalRevenue: number
    totalExpenses: number
    dateFrom: string | null
    dateTo: string | null
  }
  rows: FinancialCsvPreviewRow[]
}

export const FINANCIAL_CSV_TEMPLATES: Record<FinancialCsvKind, string> = {
  sales: [
    'date;revenue_total;base_10;tax_10;base_21;tax_21;revenue_dine_in;revenue_takeout;revenue_delivery;total_covers;labor_hours;cost_of_goods;labor_cost;day_status',
    '2026-02-01;1234,56;1122,33;112,23;0;0;900;200;134,56;78;12,5;320;210;CLOSED',
  ].join('\n'),
  expenses: [
    'expense_date;category;amount;description;provider_detail;tag;payment_method;recurrence;is_paid;taxable_amount;tax_rate;tax_amount;withholding_rate;withholding_amount;is_professional_invoice',
    '2026-02-01;PROVEEDORES_COMIDA;345,67;Factura pescado;Proveedor ejemplo;pescado;bank;NONE;si;314,25;10;31,42;0;0;si',
  ].join('\n'),
}

const REQUIRED_HEADERS: Record<FinancialCsvKind, string[]> = {
  sales: ['date', 'revenue_total'],
  expenses: ['expense_date', 'category', 'amount'],
}

const OPTIONAL_SALES_NUMBER_HEADERS = [
  'base_10',
  'tax_10',
  'base_21',
  'tax_21',
  'revenue_dine_in',
  'revenue_takeout',
  'revenue_delivery',
  'total_covers',
  'labor_hours',
  'cost_of_goods',
  'labor_cost',
] as const

const OPTIONAL_EXPENSE_NUMBER_HEADERS = [
  'taxable_amount',
  'tax_rate',
  'tax_amount',
  'withholding_rate',
  'withholding_amount',
] as const

export function parseFinancialCsvPreview(input: {
  kind: FinancialCsvKind
  csvText: string
}): FinancialCsvPreview {
  const lines = input.csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0)

  const delimiter = detectDelimiter(lines[0] ?? '')
  const headers = parseCsvLine(lines[0] ?? '', delimiter).map(normalizeHeader)
  const fileErrors = REQUIRED_HEADERS[input.kind]
    .filter(header => !headers.includes(header))
    .map(header => `Falta la columna obligatoria ${header}.`)

  const rows = lines.slice(1).map((line, index) => {
    const rowNumber = index + 2
    const values = parseCsvLine(line, delimiter)
    const rawRow = Object.fromEntries(headers.map((header, valueIndex) => [header, values[valueIndex]?.trim() ?? '']))

    if (fileErrors.length > 0) {
      return invalidRow(rowNumber, ['No se puede validar la fila porque faltan columnas obligatorias.'])
    }

    return input.kind === 'sales'
      ? parseSalesRow(rowNumber, rawRow)
      : parseExpenseRow(rowNumber, rawRow)
  })

  const validPayloads = rows
    .filter(isValidPreviewRow)
    .map(row => row.payload)

  const dates = validPayloads
    .map(payload => 'date' in payload ? payload.date : payload.expense_date)
    .sort()

  return {
    kind: input.kind,
    totalRows: rows.length,
    validRows: rows.filter(row => row.status === 'valid').length,
    invalidRows: rows.filter(row => row.status === 'invalid').length,
    fileErrors,
    duplicates: findDuplicates(rows, input.kind),
    summary: {
      totalRevenue: roundMoney(sum(validPayloads.map(payload => 'revenue_total' in payload ? payload.revenue_total : 0))),
      totalExpenses: roundMoney(sum(validPayloads.map(payload => 'amount' in payload ? payload.amount : 0))),
      dateFrom: dates[0] ?? null,
      dateTo: dates[dates.length - 1] ?? null,
    },
    rows,
  }
}

function parseSalesRow(rowNumber: number, rawRow: Record<string, string>): FinancialCsvPreviewRow {
  const errors: string[] = []
  const date = parseDate(rawRow.date)
  const revenueTotal = parseRequiredNumber(rawRow.revenue_total, 'revenue_total', errors)

  if (!date) errors.push('Fecha inválida en date. Usa formato YYYY-MM-DD.')

  if (errors.length > 0 || revenueTotal === null || !date) {
    return invalidRow(rowNumber, errors)
  }

  const payload: SalesCsvPayload = {
    date,
    revenue_total: revenueTotal,
  }

  for (const header of OPTIONAL_SALES_NUMBER_HEADERS) {
    addOptionalNumber(payload, header, rawRow[header], errors)
  }

  const dayStatus = rawRow.day_status?.toUpperCase()
  if (dayStatus) {
    if (dayStatus === 'OPEN' || dayStatus === 'CLOSED' || dayStatus === 'LOCKED') {
      payload.day_status = dayStatus
    } else {
      errors.push('Estado de día no reconocido en day_status.')
    }
  }

  return errors.length > 0 ? invalidRow(rowNumber, errors) : validRow(rowNumber, payload)
}

function parseExpenseRow(rowNumber: number, rawRow: Record<string, string>): FinancialCsvPreviewRow {
  const errors: string[] = []
  const expenseDate = parseDate(rawRow.expense_date)
  const amount = parseRequiredNumber(rawRow.amount, 'amount', errors)
  const categoryResult = OperatingExpenseCategorySchema.safeParse(rawRow.category)

  if (!expenseDate) errors.push('Fecha inválida en expense_date. Usa formato YYYY-MM-DD.')
  if (!categoryResult.success) errors.push(`Categoría de gasto no reconocida: ${rawRow.category}.`)

  if (errors.length > 0 || amount === null || !expenseDate || !categoryResult.success) {
    return invalidRow(rowNumber, errors)
  }

  const payload: ExpenseCsvPayload = {
    expense_date: expenseDate,
    category: categoryResult.data,
    amount,
  }

  addOptionalText(payload, 'description', rawRow.description)
  addOptionalText(payload, 'provider_detail', rawRow.provider_detail)
  addOptionalText(payload, 'tag', rawRow.tag)

  const paymentMethod = rawRow.payment_method
  if (paymentMethod) {
    if (paymentMethod === 'bank' || paymentMethod === 'cash' || paymentMethod === 'card' || paymentMethod === 'transfer' || paymentMethod === 'other') {
      payload.payment_method = paymentMethod
    } else {
      errors.push('Método de pago no reconocido en payment_method.')
    }
  }

  const recurrence = rawRow.recurrence?.toUpperCase()
  if (recurrence) {
    if (recurrence === 'NONE' || recurrence === 'DAILY' || recurrence === 'WEEKLY' || recurrence === 'MONTHLY' || recurrence === 'YEARLY') {
      payload.recurrence = recurrence
    } else {
      errors.push('Recurrencia no reconocida en recurrence.')
    }
  }

  if (rawRow.is_paid) payload.is_paid = parseBoolean(rawRow.is_paid)
  if (rawRow.is_professional_invoice) payload.is_professional_invoice = parseBoolean(rawRow.is_professional_invoice)

  for (const header of OPTIONAL_EXPENSE_NUMBER_HEADERS) {
    addOptionalNumber(payload, header, rawRow[header], errors)
  }

  return errors.length > 0 ? invalidRow(rowNumber, errors) : validRow(rowNumber, payload)
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

function parseRequiredNumber(value: string | undefined, field: string, errors: string[]) {
  const parsed = parseNumber(value)
  if (parsed === null) errors.push(`Número inválido en ${field}.`)
  return parsed
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

function addOptionalNumber<T extends object, K extends keyof T>(
  payload: T,
  key: K,
  value: string | undefined,
  errors: string[],
) {
  if (!value?.trim()) return

  const parsed = parseNumber(value)
  if (parsed === null) {
    errors.push(`Número inválido en ${String(key)}.`)
    return
  }

  payload[key] = parsed as T[K]
}

function addOptionalText<T extends object, K extends keyof T>(payload: T, key: K, value: string | undefined) {
  if (!value?.trim()) return
  payload[key] = value.trim() as T[K]
}

function parseBoolean(value: string) {
  const normalized = value.trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'sí' || normalized === 'si' || normalized === 'yes'
}

function validRow(rowNumber: number, payload: SalesCsvPayload | ExpenseCsvPayload): FinancialCsvPreviewRow {
  return { rowNumber, status: 'valid', payload, errors: [] }
}

function invalidRow(rowNumber: number, errors: string[]): FinancialCsvPreviewRow {
  return { rowNumber, status: 'invalid', errors }
}

function isValidPreviewRow(
  row: FinancialCsvPreviewRow,
): row is FinancialCsvPreviewRow & { status: 'valid'; payload: SalesCsvPayload | ExpenseCsvPayload } {
  return row.status === 'valid' && row.payload !== undefined
}

function findDuplicates(rows: FinancialCsvPreviewRow[], kind: FinancialCsvKind) {
  const rowNumbersByKey = new Map<string, number[]>()

  for (const row of rows) {
    if (row.status !== 'valid' || !row.payload) continue
    const key = duplicateKey(row.payload, kind)
    rowNumbersByKey.set(key, [...(rowNumbersByKey.get(key) ?? []), row.rowNumber])
  }

  return [...rowNumbersByKey.entries()]
    .filter(([, rowNumbers]) => rowNumbers.length > 1)
    .map(([key, rowNumbers]) => ({ key, rowNumbers }))
}

function duplicateKey(payload: SalesCsvPayload | ExpenseCsvPayload, kind: FinancialCsvKind) {
  if (kind === 'sales' && 'date' in payload) return payload.date
  if ('expense_date' in payload) {
    return [
      payload.expense_date,
      payload.category,
      payload.amount,
      payload.description ?? '',
    ].join('|')
  }
  return ''
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}
