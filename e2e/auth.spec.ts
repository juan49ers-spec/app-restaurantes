/**
 * E2E Tests: Authentication Flow
 * 
 * Tests de integración para el flujo de autenticación
 */

import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page and wait for load
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
  })

  test('debería mostrar página de login', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Control/)
    
    // Check login form elements
    await expect(page.getByRole('heading', { name: /control hub/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/contraseña/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible()
  })

  test('debería mostrar error con credenciales inválidas', async ({ page }) => {
    // Fill invalid credentials
    await page.getByLabel(/email/i).fill('invalid@example.com')
    await page.getByLabel(/contraseña/i).fill('wrongpassword')
    
    // Submit form
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    
    // Should show error message
    await expect(page.getByText(/Error/i)).toBeVisible()
  })

  test('debería navegar a página principal después de login exitoso', async ({ page }) => {
    // Note: This test requires valid test credentials
    // In a real scenario, you'd use test data or mock the auth
    
    // Fill valid credentials (mock for now)
    await page.getByLabel(/email/i).fill('test@restaurante.com')
    await page.getByLabel(/contraseña/i).fill('TestPassword123')
    
    // Submit form
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    
    // Wait for navigation
    await page.waitForURL('**/ingredients')
    
    // Should be on ingredients page
    await expect(page).toHaveURL(/.*ingredients/)
    await expect(page.getByRole('heading', { name: /ingredientes/i })).toBeVisible()
  })

  test('debería permitir logout', async ({ page }) => {
    // First login
    await page.getByLabel(/email/i).fill('test@restaurante.com')
    await page.getByLabel(/contraseña/i).fill('TestPassword123')
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    
    // Wait for navigation
    await page.waitForURL('**/ingredients')
    
    // Click logout
    await page.getByRole('button', { name: /Cerrar sesión/i }).click()
    
    // Should redirect to login
    await page.waitForURL('**/login')
    await expect(page).toHaveURL(/.*login/)
  })
})
