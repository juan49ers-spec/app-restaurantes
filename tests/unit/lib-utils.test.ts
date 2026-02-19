/**
 * TESTS UNITARIOS: Lib Utils
 * 
 * Tests para utilidades del directorio lib/
 */

import { describe, it, expect } from 'vitest'
import { cn, formatCurrency, formatPct } from '@/lib/utils'
import { 
  PROJECTION_FACTORS, 
  INFLATION_ESTIMATES, 
  EXPENSE_RATIOS,
  TARGET_RATIOS,
  EXPENSE_CATEGORIES,
  isPersonalCategory,
  isCOGSCategory,
  isInvestmentCategory
} from '@/lib/financial-constants'

describe('Lib Utils', () => {
  describe('cn', () => {
    it('debería combinar clases CSS correctamente', () => {
      const result = cn('px-4', 'py-2', 'bg-blue-500')
      expect(result).toBe('px-4 py-2 bg-blue-500')
    })

    it('debería manejar objetos de clases condicionales', () => {
      const result = cn('base-class', { 
        'active-class': true, 
        'inactive-class': false 
      })
      expect(result).toContain('base-class')
      expect(result).toContain('active-class')
      expect(result).not.toContain('inactive-class')
    })

    it('debería manejar arrays de clases', () => {
      const result = cn(['class1', 'class2'], 'class3')
      expect(result).toContain('class1')
      expect(result).toContain('class2')
      expect(result).toContain('class3')
    })

    it('debería mergear clases de tailwind correctamente', () => {
      const result = cn('px-4', 'px-6') // Debería usar px-6
      expect(result).toBe('px-6')
    })

    it('debería manejar valores falsy', () => {
      const result = cn('base', null, undefined, false, 'end')
      expect(result).toBe('base end')
    })
  })

  describe('formatCurrency', () => {
    it('debería formatear euros correctamente', () => {
      const result = formatCurrency(1234.56)
      expect(result).toContain('€')
      expect(result).toContain('1235')
    })

    it('debería redondear a enteros', () => {
      const result1 = formatCurrency(100.4)
      const result2 = formatCurrency(100.5)
      expect(result1).toContain('100')
      expect(result1).toContain('€')
      expect(result2).toContain('101')
      expect(result2).toContain('€')
    })

    it('debería manejar cero', () => {
      const result = formatCurrency(0)
      expect(result).toContain('0')
      expect(result).toContain('€')
    })

    it('debería manejar negativos', () => {
      const result = formatCurrency(-500)
      expect(result).toContain('-500')
      expect(result).toContain('€')
    })

    it('debería usar formato español', () => {
      const result = formatCurrency(1000000)
      expect(result).toContain('1.000.000')
      expect(result).toContain('€')
    })
  })

  describe('formatPct', () => {
    it('debería formatear porcentajes correctamente', () => {
      const result = formatPct(50)
      expect(result).toContain('%')
      expect(result).toContain('50')
    })

    it('debería dividir por 100 internamente', () => {
      const result = formatPct(100)
      expect(result).toContain('100,0')
      expect(result).toContain('%')
    })

    it('debería mostrar un decimal', () => {
      const result = formatPct(33.333)
      expect(result).toContain('33,3')
      expect(result).toContain('%')
    })

    it('debería manejar cero', () => {
      const result = formatPct(0)
      expect(result).toContain('0,0')
      expect(result).toContain('%')
    })

    it('debería redondear correctamente', () => {
      const result1 = formatPct(33.34)
      const result2 = formatPct(33.35)
      expect(result1).toContain('33,3')
      expect(result2).toContain('33,4')
    })
  })
})

describe('Financial Constants', () => {
  describe('PROJECTION_FACTORS', () => {
    it('debería tener multiplicador de fin de semana correcto', () => {
      expect(PROJECTION_FACTORS.WEEKEND_MULTIPLIER).toBe(1.2)
    })

    it('debería tener multiplicador de día laborable correcto', () => {
      expect(PROJECTION_FACTORS.WEEKDAY_MULTIPLIER).toBe(1.0)
    })
  })

  describe('INFLATION_ESTIMATES', () => {
    it('debería tener impacto por alerta definido', () => {
      expect(INFLATION_ESTIMATES.PER_ALERT_IMPACT_EUR).toBe(50)
    })
  })

  describe('EXPENSE_RATIOS', () => {
    it('debería tener COGS por defecto al 30%', () => {
      expect(EXPENSE_RATIOS.DEFAULT_COGS_PCT).toBe(0.30)
    })

    it('debería tener Labor por defecto al 35%', () => {
      expect(EXPENSE_RATIOS.DEFAULT_LABOR_PCT).toBe(0.35)
    })

    it('debería tener Fixed por defecto al 35%', () => {
      expect(EXPENSE_RATIOS.DEFAULT_FIXED_PCT).toBe(0.35)
    })
  })

  describe('TARGET_RATIOS', () => {
    it('debería tener target de personal al 33%', () => {
      expect(TARGET_RATIOS.PERSONAL_TARGET_PCT).toBe(33)
    })

    it('debería tener target de COGS al 33%', () => {
      expect(TARGET_RATIOS.COGS_TARGET_PCT).toBe(33)
    })

    it('debería tener max prime cost al 60%', () => {
      expect(TARGET_RATIOS.PRIME_COST_MAX_PCT).toBe(60)
    })
  })

  describe('EXPENSE_CATEGORIES', () => {
    it('debería tener categorías de personal', () => {
      expect(EXPENSE_CATEGORIES.PERSONAL).toContain('NOMINAS_LIQUIDAS')
      expect(EXPENSE_CATEGORIES.PERSONAL).toContain('SEGURIDAD_SOCIAL')
    })

    it('debería tener categorías de COGS', () => {
      expect(EXPENSE_CATEGORIES.COGS).toContain('PROVEEDORES_COMIDA')
      expect(EXPENSE_CATEGORIES.COGS).toContain('PROVEEDORES_BEBIDA')
    })

    it('debería tener categorías de inversiones', () => {
      expect(EXPENSE_CATEGORIES.INVESTMENTS).toContain('INVERSIONES')
    })
  })

  describe('isPersonalCategory', () => {
    it('debería retornar true para NOMINAS_LIQUIDAS', () => {
      expect(isPersonalCategory('NOMINAS_LIQUIDAS')).toBe(true)
    })

    it('debería retornar true para SEGURIDAD_SOCIAL', () => {
      expect(isPersonalCategory('SEGURIDAD_SOCIAL')).toBe(true)
    })

    it('debería retornar false para PROVEEDORES_COMIDA', () => {
      expect(isPersonalCategory('PROVEEDORES_COMIDA')).toBe(false)
    })

    it('debería retornar false para categoría inexistente', () => {
      expect(isPersonalCategory('UNKNOWN_CATEGORY')).toBe(false)
    })
  })

  describe('isCOGSCategory', () => {
    it('debería retornar true para PROVEEDORES_COMIDA', () => {
      expect(isCOGSCategory('PROVEEDORES_COMIDA')).toBe(true)
    })

    it('debería retornar true para VARIACION_EXISTENCIAS', () => {
      expect(isCOGSCategory('VARIACION_EXISTENCIAS')).toBe(true)
    })

    it('debería retornar false para NOMINAS_LIQUIDAS', () => {
      expect(isCOGSCategory('NOMINAS_LIQUIDAS')).toBe(false)
    })
  })

  describe('isInvestmentCategory', () => {
    it('debería retornar true para INVERSIONES', () => {
      expect(isInvestmentCategory('INVERSIONES')).toBe(true)
    })

    it('debería retornar false para otras categorías', () => {
      expect(isInvestmentCategory('ALQUILER')).toBe(false)
      expect(isInvestmentCategory('PROVEEDORES_COMIDA')).toBe(false)
    })
  })
})
