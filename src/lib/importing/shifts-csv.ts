import { ShiftStatusSchema, ShiftTypeSchema } from '@/types/schema'
import type { ShiftStatus, ShiftType } from '@/types/schema'

export type ShiftsCsvRowStatus = 'valid' | 'invalid'

export interface ShiftsCsvPayload {
  date: string
  employee_id?: string
  employee_name?: string
  start_time: string
  end_time: string
  break_minutes: number
  shift_type?: ShiftType
  status: ShiftStatus
  notes?: string
}

export interface ShiftsCsvPreviewRow {
  rowNumber: number
  status: ShiftsCsvRowStatus
  payload?: ShiftsCsvPayload
  errors: string[]
}

export interface ShiftsCsvDuplicate {
  key: string
  rowNumbers: number[]
}

export interface ShiftsCsvPreview {
  totalRows: number
  validRows: number
  invalidRows: number
  fileErrors: string[]
  duplicates: ShiftsCsvDuplicate[]
  summary: {
    totalShifts: number
    totalHours: number
    dateFrom: string | null
    dateTo: string | null
    employeeRefs: number
  }
  rows: ShiftsCsvPreviewRow[]
}

export const SHIFTS_CSV_TEMPLATE = [
  'date;employee_name;start_time;end_time;break_minutes;shift_type;status;notes',
  '2026-02-01;Maria Lopez;09:00;17:00;30;ALMUERZO;scheduled;Turno sala',
].join('\n')

const REQUIRED_HEADERS = ['date', 'start_time', 'end_time']

export function parseShiftsCsvPreview(input: { csvText: string }): ShiftsCsvPreview {
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
    ...(!headers.includes('employee_id') && !headers.includes('employee_name')
      ? ['Falta employee_id o employee_name para identificar al empleado.']
      : []),
  ]

  const rows = lines.slice(1).map((line, index) => {
    const rowNumber = index + 2
    const values = parseCsvLine(line, delimiter)
    const rawRow = Object.fromEntries(headers.map((header, valueIndex) => [header, values[valueIndex]?.trim() ?? '']))

    if (fileErrors.length > 0) {
      return invalidRow(rowNumber, ['No se puede validar la fila porque faltan columnas obligatorias.'])
    }

    return parseShiftRow(rowNumber, rawRow)
  })

  const validRows = rows.filter(isValidPreviewRow)
  const dates = validRows.map(row => row.payload.date).sort()
  const employeeRefs = new Set(validRows.map(row => employeeRefKey(row.payload)))

  return {
    totalRows: rows.length,
    validRows: validRows.length,
    invalidRows: rows.filter(row => row.status === 'invalid').length,
    fileErrors,
    duplicates: findDuplicates(rows),
    summary: {
      totalShifts: validRows.length,
      totalHours: roundHours(sum(validRows.map(row => shiftHours(row.payload)))),
      dateFrom: dates[0] ?? null,
      dateTo: dates[dates.length - 1] ?? null,
      employeeRefs: employeeRefs.size,
    },
    rows,
  }
}

function parseShiftRow(rowNumber: number, rawRow: Record<string, string>): ShiftsCsvPreviewRow {
  const errors: string[] = []
  const date = parseDate(rawRow.date)
  const startTime = parseTime(rawRow.start_time)
  const endTime = parseTime(rawRow.end_time)
  const breakMinutes = rawRow.break_minutes ? parseInteger(rawRow.break_minutes) : 0
  const employeeId = rawRow.employee_id?.trim()
  const employeeName = rawRow.employee_name?.trim()

  if (!date) errors.push('Fecha inválida en date. Usa formato YYYY-MM-DD.')
  if (!employeeId && !employeeName) errors.push('Indica employee_id o employee_name.')
  if (employeeId && !isUuid(employeeId)) errors.push('employee_id debe ser un UUID válido.')
  if (!startTime) errors.push('Hora inválida en start_time. Usa formato HH:mm.')
  if (!endTime) errors.push('Hora inválida en end_time. Usa formato HH:mm.')
  if (breakMinutes === null || breakMinutes < 0) errors.push('break_minutes debe ser un entero positivo o cero.')

  const shiftTypeRaw = rawRow.shift_type?.toUpperCase()
  const shiftTypeResult = shiftTypeRaw ? ShiftTypeSchema.safeParse(shiftTypeRaw) : null
  if (shiftTypeRaw && !shiftTypeResult?.success) errors.push(`Tipo de turno no reconocido: ${rawRow.shift_type}.`)

  const statusRaw = rawRow.status?.toLowerCase() || 'scheduled'
  const statusResult = ShiftStatusSchema.safeParse(statusRaw)
  if (!statusResult.success) errors.push(`Estado de turno no reconocido: ${rawRow.status}.`)

  if (errors.length > 0 || !date || !startTime || !endTime || breakMinutes === null || !statusResult.success) {
    return invalidRow(rowNumber, errors)
  }

  const payload: ShiftsCsvPayload = {
    date,
    start_time: startTime,
    end_time: endTime,
    break_minutes: breakMinutes,
    status: statusResult.data,
  }

  if (employeeId) payload.employee_id = employeeId
  if (employeeName) payload.employee_name = employeeName
  if (shiftTypeResult?.success) payload.shift_type = shiftTypeResult.data
  if (rawRow.notes?.trim()) payload.notes = rawRow.notes.trim()

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

function parseTime(value: string | undefined) {
  const clean = value?.trim()
  if (!clean || !/^\d{2}:\d{2}$/.test(clean)) return null
  const [hours, minutes] = clean.split(':').map(Number)
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return clean
}

function parseInteger(value: string | undefined) {
  const clean = value?.trim()
  if (!clean || !/^\d+$/.test(clean)) return null
  return Number(clean)
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function validRow(rowNumber: number, payload: ShiftsCsvPayload): ShiftsCsvPreviewRow {
  return { rowNumber, status: 'valid', payload, errors: [] }
}

function invalidRow(rowNumber: number, errors: string[]): ShiftsCsvPreviewRow {
  return { rowNumber, status: 'invalid', errors }
}

function isValidPreviewRow(
  row: ShiftsCsvPreviewRow,
): row is ShiftsCsvPreviewRow & { status: 'valid'; payload: ShiftsCsvPayload } {
  return row.status === 'valid' && row.payload !== undefined
}

function findDuplicates(rows: ShiftsCsvPreviewRow[]) {
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

function duplicateKey(payload: ShiftsCsvPayload) {
  return [
    payload.date,
    employeeRefKey(payload),
    payload.start_time,
    payload.end_time,
  ].join('|')
}

function employeeRefKey(payload: ShiftsCsvPayload) {
  return payload.employee_id
    ? `id:${payload.employee_id}`
    : `name:${normalizeEmployeeName(payload.employee_name ?? '')}`
}

function normalizeEmployeeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function shiftHours(payload: ShiftsCsvPayload) {
  const start = timeToMinutes(payload.start_time)
  const end = timeToMinutes(payload.end_time)
  const durationMinutes = (end >= start ? end - start : end + 1440 - start) - payload.break_minutes
  return Math.max(0, durationMinutes / 60)
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function roundHours(value: number) {
  return Math.round(value * 100) / 100
}
