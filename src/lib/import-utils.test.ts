import { describe, it, expect } from 'vitest'
import { parseCSV, validateIngredientsData, parseAllergens, IngredientImportRow } from './import-utils'

describe('Import Utils', () => {

    describe('parseCSV', () => {
        it('should parse comma-separated values correctly', () => {
            const csv = `nombre,unidad_base,categoria,merma_pct,precio
            Harina,kg,Secos,0,1.5
            Leche,l,Lácteos,0,0.8`

            const result = parseCSV(csv)
            expect(result).toHaveLength(2)
            expect(result[0]).toMatchObject({ nombre: 'Harina', unidad_base: 'kg', precio: 1.5 })
            expect(result[1]).toMatchObject({ nombre: 'Leche', unidad_base: 'l', precio: 0.8 })
        })

        it('should parse semicolon-separated values (European format)', () => {
            const csv = `nombre;unidad_base;precio
            Tomate;kg;2,50`

            const result = parseCSV(csv)
            expect(result).toHaveLength(1)
            expect(result[0].nombre).toBe('Tomate')
            expect(result[0].precio).toBe(2.5) // Handled "2,50" -> 2.5
        })

        it('should handle quoted strings containing separators', () => {
            const csv = `nombre,unidad,precio
            "Salsa, Tomate",kg,3.0`

            const result = parseCSV(csv)
            expect(result).toHaveLength(1)
            expect(result[0].nombre).toBe('Salsa, Tomate')
            expect(result[0].precio).toBe(3.0)
        })

        it('should normalize units (g -> kg)', () => {
            const csv = `nombre,unidad,precio
            Sal,g,0.5`

            const result = parseCSV(csv)
            expect(result[0].unidad_base).toBe('kg')
        })
    })

    describe('validateIngredientsData', () => {
        it('should pass valid rows', () => {
            const validData: IngredientImportRow[] = [
                { nombre: 'Pan', unidad_base: 'u', precio: 0.5, merma_pct: 0 }
            ]
            const result = validateIngredientsData(validData)
            expect(result.valid).toBe(true)
            expect(result.validRows).toHaveLength(1)
        })

        it('should fail rows with negative price', () => {
            const invalidData: IngredientImportRow[] = [
                { nombre: 'Error', unidad_base: 'kg', precio: -1, merma_pct: 0 }
            ]
            const result = validateIngredientsData(invalidData)
            expect(result.valid).toBe(false)
            expect(result.errors[0].field).toBe('precio')
        })

        it('should fail rows with invalid unit', () => {
            const invalidData: IngredientImportRow[] = [
                { nombre: 'Error', unidad_base: 'bananas', precio: 1, merma_pct: 0 }
            ]
            const result = validateIngredientsData(invalidData)
            expect(result.valid).toBe(false)
            expect(result.errors[0].field).toBe('unidad_base')
        })
    })

    describe('parseAllergens', () => {
        it('should map Spanish terms to IDs', () => {
            const input = 'Gluten, Lacteos, HUEVOS'
            const result = parseAllergens(input)
            expect(result).toContain('gluten')
            expect(result).toContain('lacteos')
            expect(result).toContain('huevos')
        })

        it('should map English terms to IDs', () => {
            const input = 'Milk, Eggs, Fish'
            const result = parseAllergens(input)
            expect(result).toContain('lacteos')
            expect(result).toContain('huevos')
            expect(result).toContain('pescado')
        })

        it('should ignore unknown allergens', () => {
            const input = 'Gluten, Kryptonite'
            const result = parseAllergens(input)
            expect(result).toHaveLength(1)
            expect(result).toContain('gluten')
        })
    })
})
