/**
 * E2E Tests: Ingredients Management
 * 
 * Tests de integración para la gestión de ingredientes
 */

import { test, expect } from '@playwright/test'

test.describe('Ingredients Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.waitForSelector('button[type="submit"]')
    await page.getByLabel(/email/i).fill('test@restaurante.com')
    await page.getByLabel(/contraseña/i).fill('TestPassword123')
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    await page.waitForURL('**/ingredients', { timeout: 15000 })
  })

  test('debería mostrar lista de ingredientes', async ({ page }) => {
    // Should display ingredients page
    await expect(page.getByRole('heading', { name: /ingredientes/i })).toBeVisible()
    
    // Should have table with ingredients
    await expect(page.locator('table')).toBeVisible()
    
    // Should have "Add Ingredient" button
    await expect(page.getByRole('button', { name: /nuevo ingrediente/i })).toBeVisible()
  })

  test('debería crear un nuevo ingrediente', async ({ page }) => {
    // Click add button
    await page.getByRole('button', { name: /nuevo ingrediente/i }).click()
    
    // Fill form
    await page.getByLabel(/nombre/i).fill('Tomate Cherry')
    await page.getByLabel(/unidad base/i).selectOption('kg')
    await page.getByLabel(/precio promedio/i).fill('2.50')
    await page.getByLabel(/merma/i).fill('5')
    
    // Submit form
    await page.getByRole('button', { name: /guardar/i }).click()
    
    // Should show success message
    await expect(page.getByText(/ingrediente creado exitosamente/i)).toBeVisible()
    
    // New ingredient should appear in table
    await expect(page.getByText('Tomate Cherry')).toBeVisible()
  })

  test('debería editar un ingrediente existente', async ({ page }) => {
    // Find ingredient row with edit button
    const ingredientRow = page.locator('tr', { hasText: 'Tomate Cherry' })
    await ingredientRow.getByRole('button', { name: /editar/i }).click()
    
    // Edit price
    await page.getByLabel(/precio promedio/i).clear()
    await page.getByLabel(/precio promedio/i).fill('3.00')
    
    // Save changes
    await page.getByRole('button', { name: /guardar/i }).click()
    
    // Should show success message
    await expect(page.getByText(/ingrediente actualizado/i)).toBeVisible()
    
    // Verify price updated
    await expect(page.getByText('3,00 €')).toBeVisible()
  })

  test('debería eliminar un ingrediente', async ({ page }) => {
    // Find ingredient and click delete
    const ingredientRow = page.locator('tr', { hasText: 'Tomate Cherry' })
    await ingredientRow.getByRole('button', { name: /eliminar/i }).click()
    
    // Confirm deletion
    await page.getByRole('button', { name: /confirmar/i }).click()
    
    // Should show success message
    await expect(page.getByText(/ingrediente eliminado/i)).toBeVisible()
    
    // Ingredient should no longer be in table
    await expect(page.getByText('Tomate Cherry')).not.toBeVisible()
  })

  test('debería importar ingredientes desde CSV', async ({ page }) => {
    // Click import button
    await page.getByRole('button', { name: /importar/i }).click()
    
    // Upload CSV file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'ingredients.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('nombre,unidad_base,merma_pct,precio\nCebolla,kg,10,1.50\nPimiento,kg,8,2.00')
    })
    
    // Submit import
    await page.getByRole('button', { name: /importar/i }).click()
    
    // Should show success message
    await expect(page.getByText(/2 ingredientes importados/i)).toBeVisible()
    
    // Verify ingredients appear in table
    await expect(page.getByText('Cebolla')).toBeVisible()
    await expect(page.getByText('Pimiento')).toBeVisible()
  })

  test('debería mostrar historial de precios', async ({ page }) => {
    // Click on ingredient name to view details
    await page.getByText('Cebolla').click()
    
    // Navigate to price history tab
    await page.getByRole('tab', { name: /historial/i }).click()
    
    // Should show price history chart
    await expect(page.locator('[data-testid="price-history-chart"]')).toBeVisible()
  })
})
