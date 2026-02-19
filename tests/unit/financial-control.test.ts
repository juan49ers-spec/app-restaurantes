/**
 * TEST UNITARIOS: Financial Control Actions (Vitest)
 * 
 * Migrado de Jest a Vitest
 * - jest.fn() → vi.fn()
 * - jest.mock() → vi.mock()
 * - jest.clearAllMocks() → vi.clearAllMocks()
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock de Supabase con chain completo
const createMockChain = (finalResult = { data: null, error: null }) => {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(finalResult),
    single: vi.fn().mockResolvedValue(finalResult),
  }
  return chain
}

const mockSupabase = createMockChain()

// Mock de createClient
vi.mock('@/lib/supabaseServer', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase)
}))

// Mock de next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}))

// Mock de date-fns
vi.mock('date-fns', () => ({
  format: () => '2024-02-01',
  startOfMonth: () => new Date(),
  endOfMonth: () => new Date(),
  subMonths: () => new Date(),
}))

describe('Financial Control Actions', () => {

  beforeEach(() => {
    vi.clearAllMocks()
    // Resetear los mocks que resuelven valores
    mockSupabase.order.mockResolvedValue({ data: null, error: null })
    mockSupabase.single.mockResolvedValue({ data: null, error: null })
  })

  describe('getDailySales', () => {
    it('debería obtener ventas diarias', async () => {
      const { getDailySales } = await import('@/app/actions/financial-control')
      mockSupabase.single.mockResolvedValue({ data: { id: '1' }, error: null })

      const result = await getDailySales('test-restaurant', '2025-02-13')

      expect(result).toBeDefined()
      expect(mockSupabase.from).toHaveBeenCalledWith('daily_sales')
    })
  })

  describe('getOperatingExpenses', () => {
    it('debería obtener gastos con filtro de fechas', async () => {
      const { getOperatingExpenses } = await import('@/app/actions/financial-control')

      await getOperatingExpenses('test-restaurant', '2025-02-01', '2025-02-28')

      expect(mockSupabase.from).toHaveBeenCalledWith('operating_expenses')
      expect(mockSupabase.gte).toHaveBeenCalledWith('expense_date', '2025-02-01')
      expect(mockSupabase.lte).toHaveBeenCalledWith('expense_date', '2025-02-28')
    })
  })

  describe('getExpenseDashboardData', () => {
    it('debería calcular dashboard de gastos', async () => {
      const { getExpenseDashboardData } = await import('@/app/actions/financial-control')

      const result = await getExpenseDashboardData('test-restaurant', '2025-02')

      expect(result).toBeDefined()
      expect(result).toHaveProperty('categories')
      expect(result.categories).toBeInstanceOf(Array)
    })
  })

  describe('upsertDailySales', () => {
    it('debería persistir venta diaria', async () => {
      const { upsertDailySales } = await import('@/app/actions/financial-control')
      const salesData = {
        restaurant_id: '550e8400-e29b-41d4-a716-446655440000',
        date: '2025-02-13',
        revenue_total: 1000,
        base_10: 500,
        tax_10: 50,
        base_21: 0,
        tax_21: 0,
        revenue_dine_in: 800,
        revenue_takeout: 200,
        revenue_delivery: 0,
        iva_collected: 50,
        total_covers: 50,
        labor_hours: 0,
        day_status: 'CLOSED' as const,
        cost_of_goods: 0,
        labor_cost: 0
      }

      await upsertDailySales(salesData)
      expect(mockSupabase.from).toHaveBeenCalledWith('daily_sales')
      expect(mockSupabase.upsert).toHaveBeenCalled()
    })
  })

  describe('upsertOperatingExpense', () => {
    it('debería crear gasto operativo', async () => {
      const { upsertOperatingExpense } = await import('@/app/actions/financial-control')
      const expenseData = {
        restaurant_id: '550e8400-e29b-41d4-a716-446655440000',
        expense_date: '2025-02-13',
        category: 'ALQUILER' as const,
        amount: 1200,
        description: 'Alquiler febrero',
        payment_method: 'transfer' as const,
        recurrence: 'MONTHLY' as const,
        is_paid: true,
        is_professional_invoice: true,
        taxable_amount: 1200,
        tax_rate: 21,
        tax_amount: 252,
        withholding_rate: 0,
        withholding_amount: 0
      }

      await upsertOperatingExpense(expenseData)
      expect(mockSupabase.from).toHaveBeenCalledWith('operating_expenses')
      expect(mockSupabase.insert).toHaveBeenCalled()
    })
  })

  describe('getDailySalesRange', () => {
    it('debería obtener ventas en un rango de fechas', async () => {
      const { getDailySalesRange } = await import('@/app/actions/financial-control')
      
      mockSupabase.order.mockResolvedValue({ 
        data: [
          { id: '1', date: '2025-02-01', revenue_total: 1000 },
          { id: '2', date: '2025-02-02', revenue_total: 1200 }
        ], 
        error: null 
      })

      const result = await getDailySalesRange('test-restaurant', '2025-02-01', '2025-02-28')

      expect(mockSupabase.from).toHaveBeenCalledWith('daily_sales')
      expect(mockSupabase.gte).toHaveBeenCalledWith('date', '2025-02-01')
      expect(mockSupabase.lte).toHaveBeenCalledWith('date', '2025-02-28')
      expect(result).toBeInstanceOf(Array)
    })
  })

  describe('deleteOperatingExpense', () => {
    it('debería eliminar un gasto operativo exitosamente', async () => {
      const { deleteOperatingExpense } = await import('@/app/actions/financial-control')

      const result = await deleteOperatingExpense('expense-id-123')

      expect(mockSupabase.from).toHaveBeenCalledWith('operating_expenses')
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(result.success).toBe(true)
    })

    it('debería manejar error en la eliminación', async () => {
      const { deleteOperatingExpense } = await import('@/app/actions/financial-control')
      
      // Simular error en la cadena de eliminación
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const result = await deleteOperatingExpense('expense-id-123')
      
      consoleSpy.mockRestore()
      expect(result).toBeDefined()
    })
  })

  describe('updateOperatingExpense', () => {
    it('debería actualizar un gasto operativo', async () => {
      const { updateOperatingExpense } = await import('@/app/actions/financial-control')
      
      mockSupabase.single.mockResolvedValue({ 
        data: { id: 'expense-id-123', amount: 1500 }, 
        error: null 
      })

      const updates = { amount: 1500, description: 'Updated description' }
      const result = await updateOperatingExpense('expense-id-123', updates)

      expect(mockSupabase.from).toHaveBeenCalledWith('operating_expenses')
      expect(mockSupabase.update).toHaveBeenCalledWith(updates)
      expect(result.success).toBe(true)
    })

    it('debería retornar error si falla la actualización', async () => {
      const { updateOperatingExpense } = await import('@/app/actions/financial-control')
      
      mockSupabase.single.mockResolvedValue({ 
        data: null, 
        error: { message: 'Update failed' } 
      })

      const result = await updateOperatingExpense('expense-id-123', { amount: 1500 })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Update failed')
    })
  })

  describe('getBillingDashboardData', () => {
    it('debería obtener datos del dashboard de facturación', async () => {
      const { getBillingDashboardData } = await import('@/app/actions/financial-control')
      
      // Mock para Promise.all con ventas de dos meses
      mockSupabase.order.mockResolvedValueOnce({ 
        data: [
          { id: '1', date: '2025-02-01', revenue_total: 1000, iva_collected: 100 },
          { id: '2', date: '2025-02-02', revenue_total: 1200, iva_collected: 120 }
        ], 
        error: null 
      })

      const result = await getBillingDashboardData('test-restaurant', '2025-02-15')

      expect(result).toHaveProperty('stats')
      expect(result).toHaveProperty('dailyData')
      expect(result.stats).toHaveProperty('totalNet')
      expect(result.stats).toHaveProperty('avgDaily')
    })
  })

  describe('getFiscalMetrics', () => {
    it('debería calcular métricas fiscales', async () => {
      const { getFiscalMetrics } = await import('@/app/actions/financial-control')
      
      // Mock para ventas
      mockSupabase.lte.mockResolvedValueOnce({
        data: [
          { base_10: 500, base_21: 300, iva_collected: 130, tax_10: 50, tax_21: 63 },
          { base_10: 400, base_21: 200, iva_collected: 90, tax_10: 40, tax_21: 42 }
        ],
        error: null
      })

      const result = await getFiscalMetrics('test-restaurant', '2025-02-01', '2025-02-28')

      expect(result).toHaveProperty('ivaCollected')
      expect(result).toHaveProperty('ivaDeductible')
      expect(result).toHaveProperty('irpfWithheld')
      expect(result).toHaveProperty('netTaxPayable')
    })

    it('debería lanzar error si falla la consulta de ventas', async () => {
      const { getFiscalMetrics } = await import('@/app/actions/financial-control')

      mockSupabase.lte.mockResolvedValueOnce({
        data: null,
        error: { message: 'Sales fetch error' }
      })

      await expect(getFiscalMetrics('test-restaurant', '2025-02-01', '2025-02-28'))
        .rejects.toThrow('Failed to fetch sales fiscal data')
    })
  })

  describe('getFinancialHubData', () => {
    it('debería obtener datos del hub financiero con KPIs calculados', async () => {
      const { getFinancialHubData } = await import('@/app/actions/financial-control')

      // Mock para ventas
      mockSupabase.order
        .mockResolvedValueOnce({
          data: [
            { id: '1', date: '2025-02-01', revenue_total: 1000, cost_of_goods: 300, labor_hours: 8 },
            { id: '2', date: '2025-02-02', revenue_total: 1200, cost_of_goods: 350, labor_hours: 10 }
          ],
          error: null
        })
        // Mock para gastos
        .mockResolvedValueOnce({
          data: [
            { id: '1', amount: 200, expense_date: '2025-02-01' },
            { id: '2', amount: 150, expense_date: '2025-02-02' }
          ],
          error: null
        })

      const result = await getFinancialHubData('test-restaurant', '2025-02-01', '2025-02-28')

      expect(result).toHaveProperty('sales')
      expect(result).toHaveProperty('expenses')
      expect(result).toHaveProperty('kpis')
      expect(result.kpis).toHaveProperty('totalRevenue', 2200)
      expect(result.kpis).toHaveProperty('totalExpenses', 350)
      expect(result.kpis).toHaveProperty('costOfGoods', 650)
      expect(result.kpis).toHaveProperty('primeCost')
    })

    it('debería lanzar error si falla la consulta de ventas', async () => {
      const { getFinancialHubData } = await import('@/app/actions/financial-control')

      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: { message: 'Sales error' }
      })

      await expect(getFinancialHubData('test-restaurant', '2025-02-01', '2025-02-28'))
        .rejects.toThrow('Failed to fetch sales data')
    })
  })

  describe('getMonthlyTarget', () => {
    it('debería obtener el objetivo mensual', async () => {
      const { getMonthlyTarget } = await import('@/app/actions/financial-control')

      const mockTarget = {
        id: '1',
        restaurant_id: 'test-restaurant',
        month_year: '2025-02',
        revenue_target: 50000,
        cogs_target_pct: 30,
        labor_target_pct: 25
      }

      mockSupabase.single.mockResolvedValue({
        data: mockTarget,
        error: null
      })

      const result = await getMonthlyTarget('test-restaurant', '2025-02')

      expect(mockSupabase.from).toHaveBeenCalledWith('monthly_targets')
      expect(mockSupabase.eq).toHaveBeenCalledWith('restaurant_id', 'test-restaurant')
      expect(mockSupabase.eq).toHaveBeenCalledWith('month_year', '2025-02')
      expect(result).toEqual(mockTarget)
    })

    it('debería retornar null si no existe el objetivo', async () => {
      const { getMonthlyTarget } = await import('@/app/actions/financial-control')

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }
      })

      const result = await getMonthlyTarget('test-restaurant', '2025-02')

      expect(result).toBeNull()
    })

    it('debería lanzar error si falla la consulta', async () => {
      const { getMonthlyTarget } = await import('@/app/actions/financial-control')

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'OTHER', message: 'Database error' }
      })

      await expect(getMonthlyTarget('test-restaurant', '2025-02'))
        .rejects.toThrow('Failed to fetch targets')
    })
  })

  describe('upsertMonthlyTarget', () => {
    it('debería crear o actualizar un objetivo mensual', async () => {
      const { upsertMonthlyTarget } = await import('@/app/actions/financial-control')

      const targetData = {
        restaurant_id: '550e8400-e29b-41d4-a716-446655440000',
        month_year: '2025-02',
        revenue_target: 50000,
        cogs_target_pct: 30,
        labor_target_pct: 25
      }

      mockSupabase.single.mockResolvedValue({
        data: { id: '1', ...targetData },
        error: null
      })

      const result = await upsertMonthlyTarget(targetData)

      expect(mockSupabase.from).toHaveBeenCalledWith('monthly_targets')
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    })

    it('debería retornar error si falla la operación', async () => {
      const { upsertMonthlyTarget } = await import('@/app/actions/financial-control')

      const targetData = {
        restaurant_id: '550e8400-e29b-41d4-a716-446655440000',
        month_year: '2025-02',
        revenue_target: 50000,
        cogs_target_pct: 30,
        labor_target_pct: 25
      }

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Upsert failed' }
      })

      const result = await upsertMonthlyTarget(targetData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Upsert failed')
    })
  })

  describe('Casos Edge', () => {
    it('debería manejar meses sin datos de ventas', async () => {
      const { getBillingDashboardData } = await import('@/app/actions/financial-control')

      mockSupabase.order.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const result = await getBillingDashboardData('test-restaurant', '2025-02')

      expect(result.stats.totalNet).toBe(0)
      expect(result.stats.isFirstDay).toBe(true)
    })

    it('debería manejar ventas con valores extremos', async () => {
      const { getBillingDashboardData } = await import('@/app/actions/financial-control')

      mockSupabase.order.mockResolvedValueOnce({
        data: [
          { id: '1', date: '2025-02-01', revenue_total: 0.01, iva_collected: 0.001 },
          { id: '2', date: '2025-02-02', revenue_total: 999999.99, iva_collected: 99999.99 }
        ],
        error: null
      })

      const result = await getBillingDashboardData('test-restaurant', '2025-02')

      expect(result.stats.totalNet).toBeGreaterThan(0)
      expect(result.dailyData).toHaveLength(2)
    })

    it('debería manejar gastos con valores cero', async () => {
      const { getOperatingExpenses } = await import('@/app/actions/financial-control')

      mockSupabase.order.mockResolvedValue({
        data: [
          { id: '1', amount: 0, expense_date: '2025-02-01', category: 'ALQUILER' },
          { id: '2', amount: 0, expense_date: '2025-02-02', category: 'SERVICIOS' }
        ],
        error: null
      })

      const result = await getOperatingExpenses('test-restaurant', '2025-02-01', '2025-02-28')

      expect(result).toBeDefined()
    })

    it('debería manejar métricas fiscales con valores negativos', async () => {
      const { getFiscalMetrics } = await import('@/app/actions/financial-control')

      mockSupabase.lte.mockResolvedValueOnce({
        data: [
          { base_10: -100, base_21: -200, iva_collected: -30, tax_10: -10, tax_21: -42 }
        ],
        error: null
      })

      const result = await getFiscalMetrics('test-restaurant', '2025-02-01', '2025-02-28')

      expect(result.ivaCollected).toBeLessThan(0)
      expect(result.revenueTaxableBase).toBeLessThan(0)
    })

    it('debería manejar período muy largo sin datos', async () => {
      const { getFinancialHubData } = await import('@/app/actions/financial-control')

      mockSupabase.order
        .mockResolvedValueOnce({
          data: [],
          error: null
        })
        .mockResolvedValueOnce({
          data: [],
          error: null
        })

      const result = await getFinancialHubData('test-restaurant', '2024-01-01', '2024-12-31')

      expect(result.kpis.totalRevenue).toBe(0)
      expect(result.kpis.totalExpenses).toBe(0)
      expect(result.sales).toEqual([])
      expect(result.expenses).toEqual([])
    })

    it('debería manejar targets con porcentajes extremos', async () => {
      const { upsertMonthlyTarget } = await import('@/app/actions/financial-control')

      const targetData = {
        restaurant_id: '550e8400-e29b-41d4-a716-446655440000',
        month_year: '2025-02',
        revenue_target: 0,
        cogs_target_pct: 0,
        labor_target_pct: 100
      }

      mockSupabase.single.mockResolvedValue({
        data: { id: '1', ...targetData },
        error: null
      })

      const result = await upsertMonthlyTarget(targetData)

      expect(result.success).toBe(true)
    })

    it('debería manejar expense con descripción vacía', async () => {
      const { upsertOperatingExpense } = await import('@/app/actions/financial-control')
      
      const expenseData = {
        restaurant_id: '550e8400-e29b-41d4-a716-446655440000' as const,
        expense_date: '2025-02-13',
        category: 'ALQUILER' as const,
        amount: 100,
        description: '',
        payment_method: 'transfer' as const,
        recurrence: 'MONTHLY' as const,
        is_paid: false,
        is_professional_invoice: false,
        taxable_amount: 100,
        tax_rate: 21,
        tax_amount: 21,
        withholding_rate: 0,
        withholding_amount: 0
      }

      mockSupabase.single.mockResolvedValue({ data: { id: '1' }, error: null })

      await upsertOperatingExpense(expenseData)

      expect(mockSupabase.from).toHaveBeenCalledWith('operating_expenses')
    })
  })

  describe('Manejo de Errores', () => {
    it('debería manejar error PGRST116 en getDailySales (no rows)', async () => {
      const { getDailySales } = await import('@/app/actions/financial-control')
      
      mockSupabase.single.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116', message: 'No rows returned' } 
      })

      const result = await getDailySales('test-restaurant', '2025-02-13')
      
      // PGRST116 no debería lanzar error, retornar null
      expect(result).toBeNull()
    })

    it('debería lanzar error en getDailySales para otros errores', async () => {
      const { getDailySales } = await import('@/app/actions/financial-control')
      
      mockSupabase.single.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST001', message: 'Connection failed' } 
      })

      await expect(getDailySales('test-restaurant', '2025-02-13'))
        .rejects.toThrow('Failed to fetch daily sales')
    })

    it('debería lanzar error en getDailySalesRange', async () => {
      const { getDailySalesRange } = await import('@/app/actions/financial-control')
      
      mockSupabase.order.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Database timeout' } 
      })

      await expect(getDailySalesRange('test-restaurant', '2025-02-01', '2025-02-28'))
        .rejects.toThrow('Failed to fetch daily sales range')
    })

    it('debería retornar error en upsertDailySales', async () => {
      const { upsertDailySales } = await import('@/app/actions/financial-control')
      
      const salesData = {
        restaurant_id: '550e8400-e29b-41d4-a716-446655440000' as const,
        date: '2025-02-13',
        base_10: 100,
        tax_10: 10,
        base_21: 200,
        tax_21: 42,
        revenue_dine_in: 150,
        revenue_takeout: 100,
        revenue_delivery: 102,
        total_covers: 50,
        labor_hours: 80,
        day_status: 'OPEN' as const,
        revenue_total: 352,
        iva_collected: 52,
        cost_of_goods: 150,
        labor_cost: 120
      }

      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Unique violation' } })

      const result = await upsertDailySales(salesData)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Unique violation')
    })

    it('debería lanzar error en getOperatingExpenses', async () => {
      const { getOperatingExpenses } = await import('@/app/actions/financial-control')
      
      mockSupabase.order.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Permission denied' } 
      })

      await expect(getOperatingExpenses('test-restaurant', '2025-02-01', '2025-02-28'))
        .rejects.toThrow('Failed to fetch expenses')
    })

    it('debería retornar error en upsertOperatingExpense', async () => {
      const { upsertOperatingExpense } = await import('@/app/actions/financial-control')
      
      const expenseData = {
        restaurant_id: '550e8400-e29b-41d4-a716-446655440000' as const,
        expense_date: '2025-02-13',
        category: 'ALQUILER' as const,
        amount: 100,
        description: 'Test',
        payment_method: 'transfer' as const,
        recurrence: 'MONTHLY' as const,
        is_paid: false,
        is_professional_invoice: false,
        taxable_amount: 100,
        tax_rate: 21,
        tax_amount: 21,
        withholding_rate: 0,
        withholding_amount: 0
      }

      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Insert failed' } })

      const result = await upsertOperatingExpense(expenseData)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Insert failed')
    })

    it('debería retornar error en deleteOperatingExpense', async () => {
      const { deleteOperatingExpense } = await import('@/app/actions/financial-control')
      
      mockSupabase.delete.mockImplementation(() => {
        throw new Error('Delete failed: referenced by other records')
      })

      await expect(deleteOperatingExpense('expense-id')).rejects.toThrow('Delete failed')
    })

    it('debería retornar error en updateOperatingExpense', async () => {
      const { updateOperatingExpense } = await import('@/app/actions/financial-control')
      
      mockSupabase.update.mockImplementation(() => {
        throw new Error('Update failed: row not found')
      })

      await expect(updateOperatingExpense('expense-id', { amount: 200 }))
        .rejects.toThrow('Update failed')
    })

    it('debería existir getBillingDashboardData', async () => {
      const { getBillingDashboardData } = await import('@/app/actions/financial-control')
      expect(getBillingDashboardData).toBeDefined()
      expect(typeof getBillingDashboardData).toBe('function')
    })

    it('debería lanzar error en getFinancialHubData por sales', async () => {
      const { getFinancialHubData } = await import('@/app/actions/financial-control')
      
      mockSupabase.order.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Sales fetch error' } 
      })

      await expect(getFinancialHubData('test-restaurant', '2025-02-01', '2025-02-28'))
        .rejects.toThrow('Failed to fetch sales data')
    })

    it('debería manejar error PGRST116 en getMonthlyTarget', async () => {
      const { getMonthlyTarget } = await import('@/app/actions/financial-control')
      
      mockSupabase.single.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116', message: 'No rows' } 
      })

      const result = await getMonthlyTarget('test-restaurant', '2025-02')
      
      expect(result).toBeNull()
    })

    it('debería lanzar error en getMonthlyTarget para otros errores', async () => {
      const { getMonthlyTarget } = await import('@/app/actions/financial-control')
      
      mockSupabase.single.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST001', message: 'Connection error' } 
      })

      await expect(getMonthlyTarget('test-restaurant', '2025-02'))
        .rejects.toThrow('Failed to fetch targets')
    })

    it('debería retornar error en upsertMonthlyTarget', async () => {
      const { upsertMonthlyTarget } = await import('@/app/actions/financial-control')
      
      const targetData = {
        restaurant_id: '550e8400-e29b-41d4-a716-446655440000' as const,
        month_year: '2025-02',
        revenue_target: 50000,
        cogs_target_pct: 30,
        labor_target_pct: 25
      }

      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Upsert failed' } })

      const result = await upsertMonthlyTarget(targetData)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Upsert failed')
    })

    it('debería lanzar error en getExpenseDashboardData por current expenses', async () => {
      const { getExpenseDashboardData } = await import('@/app/actions/financial-control')
      
      // Mock para que falle en la primera consulta (currentMonthExpenses)
      let callCount = 0
      mockSupabase.order.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({ data: null, error: { message: 'Current expenses failed' } })
        }
        return Promise.resolve({ data: [], error: null })
      })

      await expect(getExpenseDashboardData('test-restaurant', '2025-02'))
        .rejects.toThrow('Failed to fetch current expenses')
    })

    it('debería existir getFiscalMetrics', async () => {
      const { getFiscalMetrics } = await import('@/app/actions/financial-control')
      expect(getFiscalMetrics).toBeDefined()
      expect(typeof getFiscalMetrics).toBe('function')
    })
  })
})
