/**
 * E2E Tests: Financial Dashboard
 * 
 * Tests de integración para el dashboard de control financiero
 */

import { test, expect } from '@playwright/test'

test.describe('Financial Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.waitForSelector('button[type="submit"]')
    await page.getByLabel(/email/i).fill('test@restaurante.com')
    await page.getByLabel(/contraseña/i).fill('TestPassword123')
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    await page.waitForURL('**/ingredients', { timeout: 15000 })
    
    // Navigate to financial dashboard
    await page.goto('/financial-control')
  })

  test('debería mostrar dashboard financiero', async ({ page }) => {
    // Should display financial dashboard
    await expect(page.getByRole('heading', { name: /control financiero/i })).toBeVisible()
    
    // Should show KPIs
    await expect(page.getByText(/gasto total/i)).toBeVisible()
    await expect(page.getByText(/ratio personal/i)).toBeVisible()
    await expect(page.getByText(/ratio materia prima/i)).toBeVisible()
    
    // Should have tabs
    await expect(page.getByRole('tab', { name: /gastos/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /ventas/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /objetivos/i })).toBeVisible()
  })

  test('debería mostrar insight de IA', async ({ page }) => {
    // Check AI insight section
    await expect(page.getByText(/insight/i)).toBeVisible()
    
    // Should show variation percentage
    await expect(page.getByText(/variado un/i)).toBeVisible()
    
    // Should show personal cost analysis
    await expect(page.getByText(/coste de personal/i)).toBeVisible()
    
    // Should show COGS analysis
    await expect(page.getByText(/materia prima/i)).toBeVisible()
  })

  test('debería registrar un gasto operativo', async ({ page }) => {
    // Click add expense button
    await page.getByRole('button', { name: /nuevo gasto/i }).click()
    
    // Fill expense form
    await page.getByLabel(/categoría/i).selectOption('NOMINAS_LIQUIDAS')
    await page.getByLabel(/monto/i).fill('2500')
    await page.getByLabel(/fecha/i).fill('2024-02-15')
    await page.getByLabel(/descripción/i).fill('Nómina personal cocina')
    
    // Submit form
    await page.getByRole('button', { name: /guardar/i }).click()
    
    // Should show success message
    await expect(page.getByText(/gasto registrado/i)).toBeVisible()
    
    // Expense should appear in list
    await expect(page.getByText('Nómina personal cocina')).toBeVisible()
  })

  test('debería registrar ventas diarias', async ({ page }) => {
    // Navigate to sales tab
    await page.getByRole('tab', { name: /ventas/i }).click()
    
    // Click add sales button
    await page.getByRole('button', { name: /registrar ventas/i }).click()
    
    // Fill sales form
    await page.getByLabel(/fecha/i).fill('2024-02-15')
    await page.getByLabel(/base 10%/i).fill('500')
    await page.getByLabel(/base 21%/i).fill('800')
    await page.getByLabel(/coberturas/i).fill('45')
    
    // Submit form
    await page.getByRole('button', { name: /guardar/i }).click()
    
    // Should show success message
    await expect(page.getByText(/ventas registradas/i)).toBeVisible()
  })

  test('debería mostrar gráficos de tendencia', async ({ page }) => {
    // Check for charts
    await expect(page.locator('[data-testid="expense-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="sales-chart"]')).toBeVisible()
    
    // Should have sparklines for 6 months history
    const sparklines = page.locator('[data-testid="sparkline"]')
    await expect(sparklines).toHaveCount(6)
  })

  test('debería filtrar por período', async ({ page }) => {
    // Select month filter
    await page.getByLabel(/mes/i).selectOption('2024-02')
    
    // Should update dashboard data
    await expect(page.getByText(/febrero 2024/i)).toBeVisible()
    
    // Charts should update
    await expect(page.locator('[data-testid="expense-chart"]')).toBeVisible()
  })

  test('debería configurar objetivos mensuales', async ({ page }) => {
    // Navigate to targets tab
    await page.getByRole('tab', { name: /objetivos/i }).click()
    
    // Set revenue target
    await page.getByLabel(/objetivo de ventas/i).clear()
    await page.getByLabel(/objetivo de ventas/i).fill('50000')
    
    // Set cost targets
    await page.getByLabel(/objetivo coste personal/i).clear()
    await page.getByLabel(/objetivo coste personal/i).fill('30')
    
    await page.getByLabel(/objetivo materia prima/i).clear()
    await page.getByLabel(/objetivo materia prima/i).fill('33')
    
    // Save targets
    await page.getByRole('button', { name: /guardar objetivos/i }).click()
    
    // Should show success message
    await expect(page.getByText(/objetivos guardados/i)).toBeVisible()
  })
})
