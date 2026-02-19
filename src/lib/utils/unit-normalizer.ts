/**
 * FASE 2.3: Normalizador de Unidades para Ingredientes
 * 
 * Normaliza diferentes formatos de unidades (kg, kilos, g, l, ml, uds, etc.)
 * a un formato estándar para evitar duplicados y errores en la ingesta.
 */

export const UNIT_ALIASES: Record<string, string> = {
    // Peso - Kilogramos
    'kg': 'kg',
    'kilos': 'kg',
    'kilogramo': 'kg',
    'kilogramos': 'kg',
    'kilo': 'kg',
    'kgs': 'kg',
    
    // Peso - Gramos
    'g': 'g',
    'gramo': 'g',
    'gramos': 'g',
    'gr': 'g',
    'gram': 'g',
    'grams': 'g',
    'grs': 'g',
    
    // Volumen - Litros
    'l': 'l',
    'litro': 'l',
    'litros': 'l',
    'lt': 'l',
    'litre': 'l',
    'litres': 'l',
    
    // Volumen - Mililitros
    'ml': 'ml',
    'mililitro': 'ml',
    'mililitros': 'ml',
    'mililiter': 'ml',
    'mililiters': 'ml',
    'cc': 'ml', // centímetros cúbicos
    
    // Unidades
    'ud': 'u',
    'uds': 'u',
    'unidades': 'u',
    'unidad': 'u',
    'unit': 'u',
    'units': 'u',
    'uni': 'u',
    'un': 'u',
    'pza': 'u',
    'pz': 'u',
    'pzas': 'u',
    'pieza': 'u',
    'piezas': 'u',
    'pc': 'u',
    'pcs': 'u',
    'piece': 'u',
    'pieces': 'u'
}

/**
 * Normaliza una unidad de medida a su formato estándar.
 * 
 * @param unit - Unidad de medida (ej: "Kilos", "GR", "uds")
 * @returns Unidad normalizada (ej: "kg", "g", "u")
 * 
 * @example
 * normalizeUnit("Kilos") // => "kg"
 * normalizeUnit("gramos") // => "g"
 * normalizeUnit("PZAS") // => "u"
 */
export function normalizeUnit(unit: string): string {
    if (!unit) return 'u'
    
    const normalized = unit.toLowerCase().trim()
    return UNIT_ALIASES[normalized] || normalized
}

/**
 * Indica si una unidad es de peso.
 */
export function isWeightUnit(unit: string): boolean {
    const normalized = normalizeUnit(unit)
    return normalized === 'kg' || normalized === 'g'
}

/**
 * Indica si una unidad es de volumen.
 */
export function isVolumeUnit(unit: string): boolean {
    const normalized = normalizeUnit(unit)
    return normalized === 'l' || normalized === 'ml'
}

/**
 * Convierte una cantidad a la unidad base más pequeña.
 * - kg → g (multiplica por 1000)
 * - l → ml (multiplica por 1000)
 * - g, ml, u → sin conversión
 * 
 * @param quantity - Cantidad a convertir
 * @param unit - Unidad de medida
 * @returns Objeto con cantidad convertida y unidad base
 * 
 * @example
 * convertToBaseUnit(2, "kg") // => { quantity: 2000, unit: "g" }
 * convertToBaseUnit(500, "ml") // => { quantity: 500, unit: "ml" }
 */
export function convertToBaseUnit(
    quantity: number,
    unit: string
): { quantity: number; unit: string } {
    const normalized = normalizeUnit(unit)
    
    // Convertir kilogramos a gramos
    if (normalized === 'kg') {
        return { quantity: quantity * 1000, unit: 'g' }
    }
    
    // Convertir litros a mililitros
    if (normalized === 'l') {
        return { quantity: quantity * 1000, unit: 'ml' }
    }
    
    // Ya está en unidad base (g, ml, u)
    return { quantity, unit: normalized }
}

/**
 * Formatea una cantidad con su unidad para visualización.
 */
export function formatQuantity(quantity: number, unit: string): string {
    const { quantity: converted, unit: normalized } = convertToBaseUnit(quantity, unit)
    
    if (normalized === 'g') {
        // Mostrar en kg si es > 1000g
        if (converted >= 1000) {
            return `${(converted / 1000).toFixed(2)} kg`
        }
        return `${converted.toFixed(0)} g`
    }
    
    if (normalized === 'ml') {
        // Mostrar en l si es > 1000ml
        if (converted >= 1000) {
            return `${(converted / 1000).toFixed(2)} l`
        }
        return `${converted.toFixed(0)} ml`
    }
    
    return `${converted} u`
}

/**
 * Parser para ingredientes desde texto/CSV.
 * Maneja diferentes formatos de unidades automáticamente.
 */
export interface ParsedIngredient {
    name: string
    quantity: number
    unit: string
    originalUnit?: string
}

export function parseIngredientLine(line: string): ParsedIngredient | null {
    if (!line || line.trim().length === 0) {
        return null
    }
    
    // Formato esperado: "Nombre, cantidad, unidad"
    // Ejemplo: "Tomates, 2, kg" o "Tomates 2 kilos"
    
    // Primero intentar separar por coma
    const parts = line.split(',').map(p => p.trim())
    
    if (parts.length >= 3) {
        const name = parts[0]
        const quantity = parseFloat(parts[1])
        const rawUnit = parts[2]
        
        if (isNaN(quantity) || !rawUnit) {
            return null
        }
        
        const normalized = normalizeUnit(rawUnit)
        
        return {
            name,
            quantity,
            unit: normalized,
            originalUnit: rawUnit
        }
    }
    
    // Si no tiene comas, intentar formato "nombre cantidad unidad"
    const words = line.split(/\s+/)
    if (words.length >= 3) {
        const quantity = parseFloat(words[words.length - 2])
        const rawUnit = words[words.length - 1]
        const name = words.slice(0, -2).join(' ')
        
        if (!isNaN(quantity) && rawUnit && name) {
            const normalized = normalizeUnit(rawUnit)
            
            return {
                name,
                quantity,
                unit: normalized,
                originalUnit: rawUnit
            }
        }
    }
    
    return null
}

/**
 * Valida si un ingrediente parseado es válido.
 */
export function isValidIngredient(ingredient: ParsedIngredient): boolean {
    return !!(
        ingredient.name &&
        ingredient.name.length > 0 &&
        !isNaN(ingredient.quantity) &&
        ingredient.quantity > 0 &&
        ['kg', 'g', 'l', 'ml', 'u'].includes(ingredient.unit)
    )
}

/**
 * Normaliza un array de ingredientes parseados.
 * Filtra inválidos y asegura formato consistente.
 */
export function normalizeIngredients(ingredients: ParsedIngredient[]): ParsedIngredient[] {
    return ingredients
        .filter(isValidIngredient)
        .map(ing => ({
            ...ing,
            unit: normalizeUnit(ing.unit)
        }))
}
