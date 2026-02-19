/**
 * TESTS UNITARIOS: Financial Utils - 100% Coverage
 * 
 * Tests para cubrir las funciones extraídas de financial-control.ts
 */

import { describe, it, expect } from 'vitest'
import {
  generateTopIncreaseCategories,
  generatePersonalVsTarget,
  generateCogsVsTarget,
  generateInsightSummary,
  calculateHistoryEntry,
  generateHistoryMonths
} from '@/lib/financial-utils'

describe('Financial Utils - 100% Coverage', () => {
  describe('generateTopIncreaseCategories (línea 545)', () => {
    it('debería retornar categorías con aumento (línea 545)', () => {
      const categories = [
        { category: 'NOMINAS_LIQUIDAS', amount: 1000, prevAmount: 800, weight: 50, momVariation: 25, ratioToSales: 10, ratioToTarget: 5, theoreticalTarget: 30, expenses: [] },
        { category: 'ALQUILER', amount: 500, prevAmount: 500, weight: 25, momVariation: 0, ratioToSales: 5, ratioToTarget: 0, theoreticalTarget: 20, expenses: [] },
        { category: 'PROVEEDORES_COMIDA', amount: 800, prevAmount: 600, weight: 40, momVariation: 33, ratioToSales: 8, ratioToTarget: 3, theoreticalTarget: 25, expenses: [] }
      ]

      const result = generateTopIncreaseCategories(categories)

      expect(result).toHaveLength(2)
      expect(result[0]).toBe('PROVEEDORES_COMIDA') // Mayor aumento primero
      expect(result[1]).toBe('NOMINAS_LIQUIDAS')
    })

    it('debería retornar array vacío si no hay aumentos', () => {
      const categories = [
        { category: 'NOMINAS', amount: 1000, prevAmount: 1000, weight: 50, momVariation: 0, ratioToSales: 10, ratioToTarget: 5, theoreticalTarget: 30, expenses: [] }
      ]

      const result = generateTopIncreaseCategories(categories)

      expect(result).toEqual([])
    })

    it('debería limitar a 2 categorías máximo (slice 0,2)', () => {
      const categories = [
        { category: 'NOMINAS_LIQUIDAS', amount: 100, prevAmount: 50, weight: 10, momVariation: 100, ratioToSales: 5, ratioToTarget: 2, theoreticalTarget: 10, expenses: [] },
        { category: 'ALQUILER', amount: 100, prevAmount: 60, weight: 10, momVariation: 66, ratioToSales: 5, ratioToTarget: 2, theoreticalTarget: 10, expenses: [] },
        { category: 'PROVEEDORES_COMIDA', amount: 100, prevAmount: 70, weight: 10, momVariation: 42, ratioToSales: 5, ratioToTarget: 2, theoreticalTarget: 10, expenses: [] },
        { category: 'SUMINISTROS', amount: 100, prevAmount: 80, weight: 10, momVariation: 25, ratioToSales: 5, ratioToTarget: 2, theoreticalTarget: 10, expenses: [] }
      ]

      const result = generateTopIncreaseCategories(categories)

      expect(result).toHaveLength(2)
    })
  })

  describe('generatePersonalVsTarget', () => {
    it('debería generar mensaje cuando excede objetivo + 2%', () => {
      const result = generatePersonalVsTarget(36) // 33% + 3%

      expect(result).toContain('⚠️ Excede objetivo')
    })

    it('debería generar mensaje cuando está dentro de objetivo', () => {
      const result = generatePersonalVsTarget(30)

      expect(result).toContain('✅ Dentro de objetivo')
    })

    it('debería generar mensaje neutral cuando está entre objetivo y objetivo + 2%', () => {
      const result = generatePersonalVsTarget(34) // Entre 33% y 35%

      expect(result).not.toContain('⚠️')
      expect(result).not.toContain('✅')
    })
  })

  describe('generateCogsVsTarget', () => {
    it('debería generar mensaje cuando excede objetivo + 2%', () => {
      const result = generateCogsVsTarget(36)

      expect(result).toContain('⚠️ Excede objetivo')
    })

    it('debería generar mensaje cuando está dentro de objetivo', () => {
      const result = generateCogsVsTarget(30)

      expect(result).toContain('✅ Dentro de objetivo')
    })
  })

  describe('generateInsightSummary (línea 560)', () => {
    it('debería generar summary con variación positiva (línea 560)', () => {
      const result = generateInsightSummary(
        5.5,
        ['NOMINAS_LIQUIDAS', 'ALQUILER'],
        'Personal dentro de objetivo',
        'COGS dentro de objetivo'
      )

      expect(result).toContain('+5.5%')
      expect(result).toContain('Nóminas Líquidas')
      expect(result).toContain('Alquiler Local')
    })

    it('debería generar summary con variación negativa (línea 560)', () => {
      const result = generateInsightSummary(
        -3.2,
        [],
        'Personal ok',
        'COGS ok'
      )

      expect(result).toContain('-3.2%')
    })

    it('debería incluir categorías con aumento (map + join)', () => {
      const result = generateInsightSummary(
        10,
        ['NOMINAS_LIQUIDAS', 'PROVEEDORES_COMIDA'],
        'Personal ok',
        'COGS ok'
      )

      expect(result).toContain('Nóminas Líquidas')
      expect(result).toContain('Proveedores Comida')
      expect(result).toContain(' y ')
    })

    it('debería manejar array vacío de categorías', () => {
      const result = generateInsightSummary(0, [], 'Personal ok', 'COGS ok')

      expect(result).toContain('El gasto total ha variado un +0.0%')
    })
  })

  describe('calculateHistoryEntry (líneas 588-592)', () => {
    it('debería calcular total con reduce (línea 588)', () => {
      const expenses = [
        { category: 'NOMINAS', amount: 1000 },
        { category: 'ALQUILER', amount: 500 },
        { category: 'PROVEEDORES', amount: 800 }
      ]

      const result = calculateHistoryEntry('2024-02', expenses)

      expect(result.total).toBe(2300)
      expect(result.month).toBe('2024-02')
    })

    it('debería agrupar por categoría con forEach (líneas 590-592)', () => {
      const expenses = [
        { category: 'NOMINAS', amount: 1000 },
        { category: 'NOMINAS', amount: 500 },
        { category: 'ALQUILER', amount: 800 }
      ]

      const result = calculateHistoryEntry('2024-02', expenses)

      expect(result.byCategory['NOMINAS']).toBe(1500)
      expect(result.byCategory['ALQUILER']).toBe(800)
    })

    it('debería manejar amount undefined/null', () => {
      const expenses = [
        { category: 'NOMINAS', amount: 1000 },
        { category: 'ALQUILER', amount: null as any },
        { category: 'PROVEEDORES', amount: undefined as any }
      ]

      const result = calculateHistoryEntry('2024-02', expenses as any)

      expect(result.total).toBe(1000)
    })

    it('debería manejar array vacío', () => {
      const result = calculateHistoryEntry('2024-02', [])

      expect(result.total).toBe(0)
      expect(Object.keys(result.byCategory)).toHaveLength(0)
    })
  })

  describe('generateHistoryMonths', () => {
    it('debería generar 6 meses de historial', () => {
      const targetDate = new Date('2024-02-15')
      
      const result = generateHistoryMonths(targetDate)

      expect(result).toHaveLength(6)
      expect(result[0].month).toBe('2023-09')
      expect(result[5].month).toBe('2024-02')
    })

    it('debería incluir fechas de inicio y fin de mes', () => {
      const targetDate = new Date('2024-02-15')
      
      const result = generateHistoryMonths(targetDate)

      expect(result[5].start).toBe('2024-02-01')
      expect(result[5].end).toBe('2024-02-29')
    })
  })
})
