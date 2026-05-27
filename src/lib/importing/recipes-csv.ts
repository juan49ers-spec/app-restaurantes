export interface RecipesCsvPayload {
  name: string
  selling_price: number
  current_cost: number
  target_margin_pct: number
  prep_time_minutes: number
  yields: number
  hourly_rate: number
}

export interface RecipesCsvPreviewRow {
  rowNumber: number
  status: 'valid' | 'invalid'
  payload?: RecipesCsvPayload
  errors: string[]
}

export interface RecipesCsvDuplicate {
  key: string
  rowNumbers: number[]
}

export interface RecipesCsvPreview {
  totalRows: number
  validRows: number
  invalidRows: number
  fileErrors: string[]
  duplicates: RecipesCsvDuplicate[]
  summary: {
    totalRecipes: number
    avgSellingPrice: number
    avgCurrentCost: number
  }
  rows: RecipesCsvPreviewRow[]
}

export const RECIPES_CSV_TEMPLATE = [
  'name;selling_price;current_cost;target_margin_pct;prep_time_minutes;yields;hourly_rate',
  'Tortilla de patata;12,50;3,20;72;15;1;0',
  'Croquetas;9,00;2,10;76;20;1;0',
].join('\n')

const REQUIRED_HEADERS = ['name', 'selling_price']

export function parseRecipesCsvPreview(input: { csvText: string }): RecipesCsvPreview {
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

    return parseRecipeRow(rowNumber, rawRow)
  })

  const validPayloads = rows
    .filter(isValidRecipeRow)
    .map(row => row.payload)

  return {
    totalRows: rows.length,
    validRows: validPayloads.length,
    invalidRows: rows.filter(row => row.status === 'invalid').length,
    fileErrors,
    duplicates: findDuplicates(rows),
    summary: {
      totalRecipes: validPayloads.length,
      avgSellingPrice: average(validPayloads.map(payload => payload.selling_price)),
      avgCurrentCost: average(validPayloads.map(payload => payload.current_cost)),
    },
    rows,
  }
}

function parseRecipeRow(rowNumber: number, rawRow: Record<string, string>): RecipesCsvPreviewRow {
  const errors: string[] = []
  const name = rawRow.name?.trim()
  const sellingPrice = parseNumber(rawRow.selling_price)
  const currentCost = parseOptionalNumber(rawRow.current_cost, 0)
  const targetMarginPct = parseOptionalNumber(rawRow.target_margin_pct, 70)
  const prepTimeMinutes = parseOptionalInteger(rawRow.prep_time_minutes, 0)
  const yields = parseOptionalNumber(rawRow.yields, 1)
  const hourlyRate = parseOptionalNumber(rawRow.hourly_rate, 0)

  if (!name) errors.push('name es obligatorio.')
  if (sellingPrice === null || sellingPrice < 0) errors.push('selling_price debe ser mayor o igual que 0.')
  if (currentCost === null || currentCost < 0) errors.push('current_cost debe ser mayor o igual que 0.')
  if (targetMarginPct === null || targetMarginPct < 0 || targetMarginPct > 100) errors.push('target_margin_pct debe estar entre 0 y 100.')
  if (prepTimeMinutes === null || prepTimeMinutes < 0) errors.push('prep_time_minutes debe ser un entero mayor o igual que 0.')
  if (yields === null || yields <= 0) errors.push('yields debe ser mayor que 0.')
  if (hourlyRate === null || hourlyRate < 0) errors.push('hourly_rate debe ser mayor o igual que 0.')

  if (
    errors.length > 0 ||
    !name ||
    sellingPrice === null ||
    currentCost === null ||
    targetMarginPct === null ||
    prepTimeMinutes === null ||
    yields === null ||
    hourlyRate === null
  ) {
    return invalidRow(rowNumber, errors)
  }

  return validRow(rowNumber, {
    name,
    selling_price: sellingPrice,
    current_cost: currentCost,
    target_margin_pct: targetMarginPct,
    prep_time_minutes: prepTimeMinutes,
    yields,
    hourly_rate: hourlyRate,
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

function parseNumber(value: string | undefined) {
  const clean = value?.trim()
  if (!clean) return null
  const normalized = clean.replace(/\./g, '').replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null
  return Number(normalized)
}

function parseOptionalNumber(value: string | undefined, fallback: number) {
  return value?.trim() ? parseNumber(value) : fallback
}

function parseOptionalInteger(value: string | undefined, fallback: number) {
  if (!value?.trim()) return fallback
  if (!/^\d+$/.test(value.trim())) return null
  return Number(value)
}

function validRow(rowNumber: number, payload: RecipesCsvPayload): RecipesCsvPreviewRow {
  return { rowNumber, status: 'valid', payload, errors: [] }
}

function invalidRow(rowNumber: number, errors: string[]): RecipesCsvPreviewRow {
  return { rowNumber, status: 'invalid', errors }
}

function isValidRecipeRow(
  row: RecipesCsvPreviewRow,
): row is RecipesCsvPreviewRow & { status: 'valid'; payload: RecipesCsvPayload } {
  return row.status === 'valid' && row.payload !== undefined
}

function findDuplicates(rows: RecipesCsvPreviewRow[]) {
  const rowNumbersByKey = new Map<string, number[]>()
  for (const row of rows) {
    if (row.status !== 'valid' || !row.payload) continue
    const key = normalizeRecipeName(row.payload.name)
    rowNumbersByKey.set(key, [...(rowNumbersByKey.get(key) ?? []), row.rowNumber])
  }
  return [...rowNumbersByKey.entries()]
    .filter(([, rowNumbers]) => rowNumbers.length > 1)
    .map(([key, rowNumbers]) => ({ key, rowNumbers }))
}

function normalizeRecipeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 100) / 100
}
