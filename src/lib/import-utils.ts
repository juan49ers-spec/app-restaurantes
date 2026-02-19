import { AllergenId } from '../components/ingredients/AllergenSelector'

export interface IngredientImportRow {
  nombre: string
  unidad_base: 'kg' | 'l' | 'u' | string
  categoria?: string
  merma_pct: number
  precio: number
  alergenos?: string
}

export interface ImportError {
  row: number
  field: string
  message: string
  value: string
}

export interface ImportValidationResult {
  valid: boolean
  validRows: IngredientImportRow[]
  invalidRows: IngredientImportRow[]
  errors: ImportError[]
}

// Valid unidades permitidas

// Mapeo de unidades alternativas a estandar
const UNIT_MAPPING: Record<string, string> = {
  'g': 'kg',
  'gramo': 'kg',
  'gramos': 'kg',
  'ml': 'l',
  'mililitro': 'l',
  'mililitros': 'l',
  'unidad': 'u',
  'unidades': 'u',
  'uds': 'u',
  'ud': 'u',
}

export function parseCSV(csvText: string): IngredientImportRow[] {
  const lines = csvText.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  // Detect separator based on header 
  const headerLine = lines[0].toLowerCase()
  const separator = headerLine.includes(';') ? ';' : ','

  const headers = headerLine.split(separator).map(h => h.trim())
  const rows: IngredientImportRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Handle quoted values if using comma separator (basic handling)
    // For a robust solution we'd need a proper parser, but this improves over simple split
    // Regex matches: quoted string OR non-comma sequence
    let values: string[] = []

    if (separator === ',' && line.includes('"')) {
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)
      if (matches) {
        values = matches.map(m => m.replace(/^"|"$/g, '').trim())
      } else {
        values = line.split(separator).map(v => v.trim())
      }
    } else {
      values = line.split(separator).map(v => v.trim())
    }

    const row: Partial<IngredientImportRow> = {}

    headers.forEach((header, index) => {
      const value = values[index] !== undefined ? values[index] : ''

      switch (header) {
        case 'nombre':
        case 'name':
        case 'ingrediente':
          row.nombre = value
          break
        case 'unidad_base':
        case 'unidad':
        case 'unit':
        case 'medida':
          row.unidad_base = normalizeUnit(value)
          break
        case 'categoria':
        case 'category':
        case 'grupo':
          row.categoria = value || undefined
          break
        case 'merma_pct':
        case 'merma':
        case 'waste':
        case 'merma (%)':
          // Handle "10%" or "10,5" (European decimal)
          const cleanValue = value.replace('%', '').replace(',', '.')
          row.merma_pct = parseFloat(cleanValue) || 0
          break
        case 'precio':
        case 'price':
        case 'coste':
        case 'precio/unidad':
          // Handle "2,50" -> 2.50
          const cleanPrice = value.replace('€', '').replace('$', '').replace(',', '.')
          row.precio = parseFloat(cleanPrice) || 0
          break
        case 'alergenos':
        case 'allergens':
        case 'alérgenos':
          row.alergenos = value || undefined
          break
      }
    })

    if (row.nombre) {
      if (!row.unidad_base) row.unidad_base = 'kg' // Default fallback? No, let validation catch it
      rows.push(row as IngredientImportRow)
    }
  }

  return rows
}

function normalizeUnit(unit: string): string {
  if (!unit) return ''
  const normalized = unit.toLowerCase().trim()
  return UNIT_MAPPING[normalized] || normalized
}

export function validateIngredientsData(data: IngredientImportRow[]): ImportValidationResult {
  const errors: ImportError[] = []
  const validRows: IngredientImportRow[] = []
  const invalidRows: IngredientImportRow[] = []

  data.forEach((row, index) => {
    const rowErrors: ImportError[] = []

    // Validar nombre
    if (!row.nombre || row.nombre.trim().length < 2) {
      rowErrors.push({
        row: index,
        field: 'nombre',
        message: 'El nombre debe tener al menos 2 caracteres',
        value: row.nombre || ''
      })
    }

    // Validar unidad
    if (!row.unidad_base) {
      rowErrors.push({
        row: index,
        field: 'unidad_base',
        message: 'La unidad base es obligatoria',
        value: ''
      })
    } else if (!['kg', 'l', 'u'].includes(row.unidad_base)) {
      // Convertir a unidad base si es posible
      const normalized = normalizeUnit(row.unidad_base)
      if (!['kg', 'l', 'u'].includes(normalized)) {
        rowErrors.push({
          row: index,
          field: 'unidad_base',
          message: 'Unidad no válida. Use: kg, l, u',
          value: row.unidad_base
        })
      }
    }

    // Validar merma
    if (row.merma_pct < 0 || row.merma_pct > 100) {
      rowErrors.push({
        row: index,
        field: 'merma_pct',
        message: 'La merma debe estar entre 0 y 100',
        value: String(row.merma_pct)
      })
    }

    // Validar precio
    if (row.precio < 0) {
      rowErrors.push({
        row: index,
        field: 'precio',
        message: 'El precio no puede ser negativo',
        value: String(row.precio)
      })
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors)
      invalidRows.push(row)
    } else {
      validRows.push(row)
    }
  })

  return {
    valid: errors.length === 0,
    validRows,
    invalidRows,
    errors
  }
}

// Función para parsear alérgenos desde string
export function parseAllergens(allergensString: string): AllergenId[] {
  if (!allergensString) return []

  const allergenMap: Record<string, AllergenId> = {
    'gluten': 'gluten',
    'crustaceos': 'crustaceos',
    'crustacean': 'crustaceos',
    'huevos': 'huevos',
    'egg': 'huevos',
    'eggs': 'huevos',
    'pescado': 'pescado',
    'fish': 'pescado',
    'cacahuetes': 'cacahuetes',
    'peanuts': 'cacahuetes',
    'soja': 'soja',
    'soy': 'soja',
    'lacteos': 'lacteos',
    'dairy': 'lacteos',
    'milk': 'lacteos',
    'frutos_cascara': 'frutos_cascara',
    'nuts': 'frutos_cascara',
    'apio': 'apio',
    'celery': 'apio',
    'mostaza': 'mostaza',
    'mustard': 'mostaza',
    'sesamo': 'sesamo',
    'sesame': 'sesamo',
    'sulfitos': 'sulfitos',
    'sulfites': 'sulfitos',
    'moluscos': 'moluscos',
    'molluscs': 'moluscos',
    'altramuces': 'altramuces',
    'lupin': 'altramuces',
  }

  return allergensString
    .toLowerCase()
    .split(/[,;]/)
    .map(a => a.trim())
    .filter(a => a.length > 0)
    .map(a => allergenMap[a])
    .filter((a): a is AllergenId => a !== undefined)
}
