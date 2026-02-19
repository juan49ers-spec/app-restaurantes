/**
 * E2E Tests: Recipes Management
 * 
 * Tests de integración para la gestión de recetas
 */

import { test, expect } from '@playwright/test'

test.describe('Recipes Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.waitForSelector('button[type="submit"]')
    await page.getByLabel(/email/i).fill('test@restaurante.com')
    await page.getByLabel(/contraseña/i).fill('TestPassword123')
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    await page.waitForURL('**/ingredients', { timeout: 15000 })
    
    // Navigate to recipes
    await page.goto('/recipes')
  })

  test('debería mostrar lista de recetas', async ({ page }) => {
    // Should display recipes page
    await expect(page.getByRole('heading', { name: /recetas/i })).toBeVisible()
    
    // Should have grid or list of recipes
    await expect(page.locator('[data-testid="recipes-grid"]')).toBeVisible()
    
    // Should have "Add Recipe" button
    await expect(page.getByRole('button', { name: /nueva receta/i })).toBeVisible()
  })

  test('debería crear una nueva receta', async ({ page }) => {
    // Click add button
    await page.getByRole('button', { name: /nueva receta/i }).click()
    
    // Fill recipe details
    await page.getByLabel(/nombre de la receta/i).fill('Paella Valenciana')
    await page.getByLabel(/categoría/i).selectOption('PLATO_PRINCIPAL')
    await page.getByLabel(/precio de venta/i).fill('18.50')
    await page.getByLabel(/instrucciones/i).fill('Cocinar el arroz con el caldo...')
    
    // Add ingredients
    await page.getByRole('button', { name: /agregar ingrediente/i }).click()
    await page.getByLabel(/ingrediente/i).first().selectOption('Arroz')
    await page.getByLabel(/cantidad bruta/i).first().fill('0.4')
    await page.getByLabel(/cantidad neta/i).first().fill('0.35')
    
    // Add another ingredient
    await page.getByRole('button', { name: /agregar ingrediente/i }).click()
    await page.getByLabel(/ingrediente/i).nth(1).selectOption('Pollo')
    await page.getByLabel(/cantidad bruta/i).nth(1).fill('0.25')
    await page.getByLabel(/cantidad neta/i).nth(1).fill('0.22')
    
    // Calculate cost
    await page.getByRole('button', { name: /calcular coste/i }).click()
    
    // Should show calculated cost
    await expect(page.getByText(/coste calculado/i)).toBeVisible()
    
    // Save recipe
    await page.getByRole('button', { name: /guardar receta/i }).click()
    
    // Should show success message
    await expect(page.getByText(/receta creada exitosamente/i)).toBeVisible()
    
    // New recipe should appear in list
    await expect(page.getByText('Paella Valenciana')).toBeVisible()
  })

  test('debería calcular margen de la receta', async ({ page }) => {
    // Find recipe and click to view details
    await page.getByText('Paella Valenciana').click()
    
    // Should show recipe details
    await expect(page.getByRole('heading', { name: 'Paella Valenciana' })).toBeVisible()
    
    // Should show cost breakdown
    await expect(page.getByText(/coste total/i)).toBeVisible()
    await expect(page.getByText(/precio de venta/i)).toBeVisible()
    await expect(page.getByText(/margen/i)).toBeVisible()
    
    // Verify margin calculation
    const marginText = await page.locator('[data-testid="margin-percentage"]').textContent()
    expect(marginText).toMatch(/\d+%/)
  })

  test('debería editar una receta existente', async ({ page }) => {
    // Find recipe and click edit
    const recipeCard = page.locator('[data-testid="recipe-card"]', { hasText: 'Paella Valenciana' })
    await recipeCard.getByRole('button', { name: /editar/i }).click()
    
    // Modify price
    await page.getByLabel(/precio de venta/i).clear()
    await page.getByLabel(/precio de venta/i).fill('19.90')
    
    // Recalculate
    await page.getByRole('button', { name: /calcular coste/i }).click()
    
    // Save changes
    await page.getByRole('button', { name: /guardar cambios/i }).click()
    
    // Should show success message
    await expect(page.getByText(/receta actualizada/i)).toBeVisible()
  })

  test('debería eliminar una receta', async ({ page }) => {
    // Find recipe and click delete
    const recipeCard = page.locator('[data-testid="recipe-card"]', { hasText: 'Paella Valenciana' })
    await recipeCard.getByRole('button', { name: /eliminar/i }).click()
    
    // Confirm deletion
    await page.getByRole('button', { name: /confirmar/i }).click()
    
    // Should show success message
    await expect(page.getByText(/receta eliminada/i)).toBeVisible()
    
    // Recipe should no longer be visible
    await expect(page.getByText('Paella Valenciana')).not.toBeVisible()
  })

  test('debería duplicar una receta', async ({ page }) => {
    // Find recipe and click duplicate
    const recipeCard = page.locator('[data-testid="recipe-card"]', { hasText: 'Paella Valenciana' })
    await recipeCard.getByRole('button', { name: /duplicar/i }).click()
    
    // Should open form with pre-filled data
    await expect(page.getByLabel(/nombre de la receta/i)).toHaveValue('Paella Valenciana (copia)')
    
    // Modify name
    await page.getByLabel(/nombre de la receta/i).clear()
    await page.getByLabel(/nombre de la receta/i).fill('Paella Mixta')
    
    // Save as new recipe
    await page.getByRole('button', { name: /guardar receta/i }).click()
    
    // Both recipes should exist
    await expect(page.getByText('Paella Valenciana')).toBeVisible()
    await expect(page.getByText('Paella Mixta')).toBeVisible()
  })

  test('debería mostrar historial de precios de receta', async ({ page }) => {
    // View recipe details
    await page.getByText('Paella Valenciana').click()
    
    // Navigate to price history tab
    await page.getByRole('tab', { name: /historial/i }).click()
    
    // Should show price history
    await expect(page.getByText(/evolución del coste/i)).toBeVisible()
    await expect(page.locator('[data-testid="price-history-chart"]')).toBeVisible()
  })
})
