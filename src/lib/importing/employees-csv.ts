import { ContractTypeSchema, StaffRoleSchema } from '@/types/schema'
import type { ContractType, StaffRole } from '@/types/schema'

export interface EmployeesCsvPayload {
  first_name: string
  last_name: string
  role: StaffRole
  email?: string
  phone?: string
  contract_type: ContractType
  contract_hours_weekly: number
  wage_type: 'HOURLY' | 'SALARIED' | 'MIXED'
  hourly_rate: number
  monthly_base_salary: number
  status: 'ACTIVE' | 'INACTIVE'
  color_code: string
}

export interface EmployeesCsvPreviewRow {
  rowNumber: number
  status: 'valid' | 'invalid'
  payload?: EmployeesCsvPayload
  errors: string[]
}

export interface EmployeesCsvPreview {
  totalRows: number
  validRows: number
  invalidRows: number
  fileErrors: string[]
  duplicates: { key: string; rowNumbers: number[] }[]
  summary: {
    totalEmployees: number
    activeRows: number
    estimatedMonthlyCost: number
  }
  rows: EmployeesCsvPreviewRow[]
}

export const EMPLOYEES_CSV_TEMPLATE = [
  'first_name;last_name;role;email;phone;contract_type;contract_hours_weekly;wage_type;hourly_rate;monthly_base_salary;status;color_code',
  'Maria;Lopez;FLOOR_STAFF;maria@example.com;600000001;INDEFINIDO;40;HOURLY;12,50;0;ACTIVE;#3b82f6',
  'Juan;Garcia;KITCHEN_STAFF;juan@example.com;600000002;INDEFINIDO;40;SALARIED;0;1800;ACTIVE;#10b981',
].join('\n')

const REQUIRED_HEADERS = ['first_name', 'last_name', 'role']

export function parseEmployeesCsvPreview(input: { csvText: string }): EmployeesCsvPreview {
  const lines = input.csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0)

  const delimiter = detectDelimiter(lines[0] ?? '')
  const headers = parseCsvLine(lines[0] ?? '', delimiter).map(normalizeHeader)
  const fileErrors = REQUIRED_HEADERS
    .filter(header => !headers.includes(header))
    .map(header => `Falta la columna obligatoria ${header}.`)

  const rows = lines.slice(1).map((line, index) => {
    const rowNumber = index + 2
    const values = parseCsvLine(line, delimiter)
    const rawRow = Object.fromEntries(headers.map((header, valueIndex) => [header, values[valueIndex]?.trim() ?? '']))

    if (fileErrors.length > 0) {
      return invalidRow(rowNumber, ['No se puede validar la fila porque faltan columnas obligatorias.'])
    }

    return parseEmployeeRow(rowNumber, rawRow)
  })

  const validRows = rows.filter(isValidEmployeeRow)

  return {
    totalRows: rows.length,
    validRows: validRows.length,
    invalidRows: rows.filter(row => row.status === 'invalid').length,
    fileErrors,
    duplicates: findDuplicates(rows),
    summary: {
      totalEmployees: validRows.length,
      activeRows: validRows.filter(row => row.payload.status === 'ACTIVE').length,
      estimatedMonthlyCost: validRows.reduce((total, row) => total + estimatedMonthlyCost(row.payload), 0),
    },
    rows,
  }
}

function parseEmployeeRow(rowNumber: number, rawRow: Record<string, string>): EmployeesCsvPreviewRow {
  const errors: string[] = []
  const firstName = rawRow.first_name?.trim()
  const lastName = rawRow.last_name?.trim()
  const roleRaw = rawRow.role?.trim().toUpperCase()
  const contractRaw = rawRow.contract_type?.trim().toUpperCase() || 'INDEFINIDO'
  const wageTypeRaw = rawRow.wage_type?.trim().toUpperCase() || 'HOURLY'
  const statusRaw = rawRow.status?.trim().toUpperCase() || 'ACTIVE'
  const contractHours = parseOptionalNumber(rawRow.contract_hours_weekly, 40)
  const hourlyRate = parseOptionalNumber(rawRow.hourly_rate, 0)
  const monthlyBaseSalary = parseOptionalNumber(rawRow.monthly_base_salary, 0)
  const email = rawRow.email?.trim()
  const phone = rawRow.phone?.trim()
  const colorCode = rawRow.color_code?.trim() || '#3b82f6'

  const role = StaffRoleSchema.safeParse(roleRaw)
  const contractType = ContractTypeSchema.safeParse(contractRaw)
  const wageType = wageTypeRaw === 'HOURLY' || wageTypeRaw === 'SALARIED' || wageTypeRaw === 'MIXED' ? wageTypeRaw : null
  const status = statusRaw === 'ACTIVE' || statusRaw === 'INACTIVE' ? statusRaw : null

  if (!firstName) errors.push('first_name es obligatorio.')
  if (!lastName) errors.push('last_name es obligatorio.')
  if (!role.success) errors.push(`Rol no reconocido: ${rawRow.role}.`)
  if (!contractType.success) errors.push(`contract_type no reconocido: ${rawRow.contract_type}.`)
  if (!wageType) errors.push(`wage_type no reconocido: ${rawRow.wage_type}.`)
  if (!status) errors.push(`status no reconocido: ${rawRow.status}.`)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('email no tiene formato válido.')
  if (contractHours === null || contractHours < 0) errors.push('contract_hours_weekly debe ser mayor o igual que 0.')
  if (hourlyRate === null || hourlyRate < 0) errors.push('hourly_rate debe ser mayor o igual que 0.')
  if (monthlyBaseSalary === null || monthlyBaseSalary < 0) errors.push('monthly_base_salary debe ser mayor o igual que 0.')
  if (!/^#[0-9a-f]{6}$/i.test(colorCode)) errors.push('color_code debe tener formato #RRGGBB.')

  if (
    errors.length > 0 ||
    !firstName ||
    !lastName ||
    !role.success ||
    !contractType.success ||
    !wageType ||
    !status ||
    contractHours === null ||
    hourlyRate === null ||
    monthlyBaseSalary === null
  ) {
    return invalidRow(rowNumber, errors)
  }

  return validRow(rowNumber, {
    first_name: firstName,
    last_name: lastName,
    role: role.data,
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    contract_type: contractType.data,
    contract_hours_weekly: contractHours,
    wage_type: wageType,
    hourly_rate: hourlyRate,
    monthly_base_salary: monthlyBaseSalary,
    status,
    color_code: colorCode,
  })
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

function parseOptionalNumber(value: string | undefined, fallback: number) {
  const clean = value?.trim()
  if (!clean) return fallback
  const normalized = clean.replace(/\./g, '').replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null
  return Number(normalized)
}

function validRow(rowNumber: number, payload: EmployeesCsvPayload): EmployeesCsvPreviewRow {
  return { rowNumber, status: 'valid', payload, errors: [] }
}

function invalidRow(rowNumber: number, errors: string[]): EmployeesCsvPreviewRow {
  return { rowNumber, status: 'invalid', errors }
}

function isValidEmployeeRow(
  row: EmployeesCsvPreviewRow,
): row is EmployeesCsvPreviewRow & { status: 'valid'; payload: EmployeesCsvPayload } {
  return row.status === 'valid' && row.payload !== undefined
}

function findDuplicates(rows: EmployeesCsvPreviewRow[]) {
  const rowNumbersByKey = new Map<string, number[]>()
  for (const row of rows) {
    if (row.status !== 'valid' || !row.payload) continue
    const keys = [`name:${normalizeName(`${row.payload.first_name} ${row.payload.last_name}`)}`]
    if (row.payload.email) keys.push(`email:${row.payload.email.toLowerCase()}`)
    for (const key of keys) {
      rowNumbersByKey.set(key, [...(rowNumbersByKey.get(key) ?? []), row.rowNumber])
    }
  }

  return [...rowNumbersByKey.entries()]
    .filter(([, rowNumbers]) => rowNumbers.length > 1)
    .map(([key, rowNumbers]) => ({ key, rowNumbers }))
}

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function estimatedMonthlyCost(payload: EmployeesCsvPayload) {
  if (payload.wage_type === 'SALARIED') return payload.monthly_base_salary
  if (payload.wage_type === 'MIXED') return payload.monthly_base_salary + payload.hourly_rate * 20
  return payload.hourly_rate * 160
}
