export interface RecipeSalesCsvPayload {
  date: string
  recipe_id?: string
  recipe_name?: string
  quantity_sold: number
}

export interface RecipeSalesCsvPreviewRow {
  rowNumber: number
  status: 'valid' | 'invalid'
  payload?: RecipeSalesCsvPayload
  errors: string[]
}

export interface RecipeSalesCsvDuplicate {
  key: string
  rowNumbers: number[]
}

export interface RecipeSalesCsvPreview {
  totalRows: number
  validRows: number
  invalidRows: number
  fileErrors: string[]
  duplicates: RecipeSalesCsvDuplicate[]
  summary: {
    totalUnits: number
    dateFrom: string | null
    dateTo: string | null
    recipeRefs: number
  }
  rows: RecipeSalesCsvPreviewRow[]
}

export const RECIPE_SALES_CSV_TEMPLATE = [
  'date;recipe_name;quantity_sold',
  '2026-02-01;Tortilla de patata;12',
  '2026-02-01;Croquetas;8',
].join('\n')

export function parseRecipeSalesCsvPreview(input: { csvText: string }): RecipeSalesCsvPreview {
  const lines = input.csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0)

  const delimiter = detectDelimiter(lines[0] ?? '')
  const headers = parseCsvLine(lines[0] ?? '', delimiter).map(normalizeHeader)
  const fileErrors = requiredHeaderErrors(headers)

  const rows = lines.slice(1).map((line, index) => {
    const rowNumber = index + 2
    const values = parseCsvLine(line, delimiter)
    const rawRow = Object.fromEntries(headers.map((header, valueIndex) => [header, values[valueIndex]?.trim() ?? '']))

    if (fileErrors.length > 0) {
      return invalidRow(rowNumber, ['No se puede validar la fila porque faltan columnas obligatorias.'])
    }

    return parseRecipeSaleRow(rowNumber, rawRow)
  })

  const validPayloads = rows
    .filter(isValidRecipeSalesRow)
    .map(row => row.payload)

  const dates = validPayloads.map(payload => payload.date).sort()
  const recipeRefs = new Set(validPayloads.map(payload => recipeRefKey(payload)))

  return {
    totalRows: rows.length,
    validRows: rows.filter(row => row.status === 'valid').length,
    invalidRows: rows.filter(row => row.status === 'invalid').length,
    fileErrors,
    duplicates: findDuplicates(rows),
    summary: {
      totalUnits: validPayloads.reduce((total, payload) => total + payload.quantity_sold, 0),
      dateFrom: dates[0] ?? null,
      dateTo: dates[dates.length - 1] ?? null,
      recipeRefs: recipeRefs.size,
    },
    rows,
  }
}

function requiredHeaderErrors(headers: string[]) {
  const errors: string[] = []
  if (!headers.includes('date')) errors.push('Falta la columna obligatoria date.')
  if (!headers.includes('quantity_sold')) errors.push('Falta la columna obligatoria quantity_sold.')
  if (!headers.includes('recipe_id') && !headers.includes('recipe_name')) {
    errors.push('Falta la columna recipe_id o recipe_name.')
  }
  return errors
}

function parseRecipeSaleRow(rowNumber: number, rawRow: Record<string, string>): RecipeSalesCsvPreviewRow {
  const errors: string[] = []
  const date = parseDate(rawRow.date)
  const quantity = parseInteger(rawRow.quantity_sold)
  const recipeId = rawRow.recipe_id?.trim()
  const recipeName = rawRow.recipe_name?.trim()

  if (!date) errors.push('Fecha inválida en date. Usa formato YYYY-MM-DD.')
  if (quantity === null || quantity < 0) errors.push('quantity_sold debe ser un entero mayor o igual que 0.')
  if (!recipeId && !recipeName) errors.push('Debes informar recipe_id o recipe_name.')

  if (errors.length > 0 || !date || quantity === null) {
    return invalidRow(rowNumber, errors)
  }

  return validRow(rowNumber, {
    date,
    quantity_sold: quantity,
    ...(recipeId ? { recipe_id: recipeId } : {}),
    ...(recipeName ? { recipe_name: recipeName } : {}),
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

function parseDate(value: string | undefined) {
  const clean = value?.trim()
  return clean && /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : null
}

function parseInteger(value: string | undefined) {
  const clean = value?.trim()
  if (!clean || !/^-?\d+$/.test(clean)) return null
  return Number(clean)
}

function validRow(rowNumber: number, payload: RecipeSalesCsvPayload): RecipeSalesCsvPreviewRow {
  return { rowNumber, status: 'valid', payload, errors: [] }
}

function invalidRow(rowNumber: number, errors: string[]): RecipeSalesCsvPreviewRow {
  return { rowNumber, status: 'invalid', errors }
}

function isValidRecipeSalesRow(
  row: RecipeSalesCsvPreviewRow,
): row is RecipeSalesCsvPreviewRow & { status: 'valid'; payload: RecipeSalesCsvPayload } {
  return row.status === 'valid' && row.payload !== undefined
}

function findDuplicates(rows: RecipeSalesCsvPreviewRow[]) {
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

function duplicateKey(payload: RecipeSalesCsvPayload) {
  return `${payload.date}|${recipeRefKey(payload)}`
}

function recipeRefKey(payload: RecipeSalesCsvPayload) {
  if (payload.recipe_id) return `id:${payload.recipe_id}`
  return `name:${payload.recipe_name?.trim().toLowerCase() ?? ''}`
}
