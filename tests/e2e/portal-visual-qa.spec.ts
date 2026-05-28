import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const BREAKPOINTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'wide', width: 1440, height: 900 },
] as const

const SCREENSHOT_DIR = path.join(process.cwd(), 'tests', 'e2e', 'screenshots')
const E2E_EMAIL = process.env.E2E_EMAIL
const E2E_PASSWORD = process.env.E2E_PASSWORD

function screenshotPath(name: string) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true })
  return path.join(SCREENSHOT_DIR, name)
}

async function loginAsConsultant(page: Page) {
  if (!E2E_EMAIL || !E2E_PASSWORD) {
    test.skip(true, 'QA visual requiere E2E_EMAIL y E2E_PASSWORD configurados fuera del código.')
    return
  }

  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByLabel(/correo electrónico/i).fill(E2E_EMAIL)
  await page.getByLabel(/contraseña/i).fill(E2E_PASSWORD)
  const loginButton = page.getByRole('button', { name: /iniciar sesión/i })
  await expect(loginButton).toBeEnabled({ timeout: 10000 })
  await Promise.all([
    page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 45000 }),
    loginButton.click(),
  ])
  await page.waitForLoadState('networkidle').catch(() => undefined)
}

async function expectNoVisibleErrors(page: Page) {
  const bodyText = await page.locator('body').innerText()
  expect(bodyText).not.toMatch(/Application error|Internal Server Error|undefined|NaN|null/i)
  await expect(page.getByText(/Tu consultor aún no ha publicado ningún informe/i)).toHaveCount(0)
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const viewportWidth = window.innerWidth
    const documentWidth = document.documentElement.scrollWidth
    const offenders = Array.from(document.querySelectorAll('*'))
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          tag: element.tagName,
          className: element.getAttribute('class') ?? '',
          text: (element.textContent ?? '').trim().slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        }
      })
      .filter((element) => element.right > viewportWidth + 1 || element.left < -1)
      .slice(0, 5)

    return {
      hasOverflow: documentWidth > viewportWidth + 1,
      viewportWidth,
      documentWidth,
      offenders,
    }
  })

  if (overflow.hasOverflow) {
    throw new Error(`Horizontal overflow detected: ${JSON.stringify(overflow)}`)
  }
}

async function openPortalOrSkip(page: Page) {
  await page.goto('/portal', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => undefined)
  const emptyState = await page.getByText(/Tu consultor aún no ha publicado ningún informe/i).count()
  test.skip(emptyState > 0, 'QA visual requiere un informe demo publicado en el portal.')
}

async function openFirstReportDetailOrSkip(page: Page) {
  await openPortalOrSkip(page)
  const reportLink = page.getByRole('link', { name: /Ver informe completo|Ver informe/i }).first()
  test.skip(await reportLink.count() === 0, 'QA visual requiere al menos un informe publicado.')
  await reportLink.click()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForLoadState('networkidle').catch(() => undefined)
}

test.describe.serial('Portal visual QA', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsConsultant(page)
  })

  for (const breakpoint of BREAKPOINTS) {
    test(`portal home renderiza contenido en ${breakpoint.name}`, async ({ page }) => {
      await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height })
      await openPortalOrSkip(page)

      await expectNoVisibleErrors(page)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.locator('body')).toContainText(/Informe|Portal|Histórico/i)
      await expect(page.locator('.tabular-nums').first()).toBeVisible()
      await expect(page.getByRole('heading', { name: /Histórico de informes publicados/i })).toBeVisible()

      if (breakpoint.name === 'mobile') {
        await expect(page.getByRole('link', { name: /Ver informe completo/i })).toBeVisible()
        await expect(page.getByRole('link', { name: /Descargar PDF/i }).first()).toBeVisible()
      }

      await expectNoHorizontalOverflow(page)
      await page.screenshot({
        path: screenshotPath(`portal-home-${breakpoint.name}.png`),
        fullPage: true,
      })
    })
  }

  for (const breakpoint of BREAKPOINTS) {
    test(`portal detalle renderiza informe completo en ${breakpoint.name}`, async ({ page }) => {
      await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height })
      await openFirstReportDetailOrSkip(page)

      await expectNoVisibleErrors(page)
      await expect(page.getByText(/Lectura principal/i)).toBeVisible()
      expect(await page.locator('.tabular-nums').count()).toBeGreaterThan(2)
      await expect(page.getByRole('heading', { name: /Conclusiones ejecutivas/i })).toBeVisible()
      await expect(page.getByRole('navigation', { name: /Capítulos del informe/i })).toBeVisible()
      await expect(page.getByText(/Solicitar reunión de revisión/i)).toBeVisible()
      await expect(page.getByText(/Calidad del informe/i)).toBeVisible()

      const trend = page.getByText(/Tendencia de 3 meses/i)
      if (await trend.count() > 0) {
        await expect(trend).toBeVisible()
        await expect(page.getByText(/Ventas/i).first()).toBeVisible()
      }

      const breakdown = page.getByText(/Desglose de gastos/i)
      if (await breakdown.count() > 0) {
        await expect(breakdown).toBeVisible()
        await expect(page.getByText(/Categoría/i).first()).toBeVisible()
      }

      if (breakpoint.name === 'mobile') {
        await expect(page.getByRole('link', { name: /Descargar PDF/i }).first()).toBeVisible()
        await expect(page.getByRole('button', { name: /Solicitar reunión/i })).toBeVisible()
      }

      await expectNoHorizontalOverflow(page)
      await page.screenshot({
        path: screenshotPath(`portal-detail-${breakpoint.name}.png`),
        fullPage: true,
      })
    })
  }

  test('PDF imprimible renderiza documento completo', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await openPortalOrSkip(page)

    const pdfLink = page.getByRole('link', { name: /PDF|Descargar PDF/i }).first()
    test.skip(await pdfLink.count() === 0, 'QA visual requiere enlace PDF de un informe publicado.')
    const printHref = await pdfLink.getAttribute('href')
    test.skip(!printHref, 'QA visual requiere que el enlace PDF tenga href.')
    if (!printHref) return
    await page.goto(printHref)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForLoadState('networkidle').catch(() => undefined)

    await expectNoVisibleErrors(page)
    await expect(page.getByText(/Resumen ejecutivo/i).first()).toBeVisible()
    await expect(page.getByText(/Índice/i).first()).toBeVisible()
    await expect(page.getByText(/Conclusiones ejecutivas/i).first()).toBeVisible()
    await expect(page.getByText(/Plan de revisión recomendado/i).first()).toBeVisible()
    await expect(page.getByText(/Anexo de calidad de dato/i).first()).toBeVisible()
    await expect(page.locator('.tabular-nums, article').first()).toBeVisible()

    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/undefined|null|NaN/i)
    await page.screenshot({
      path: screenshotPath('portal-pdf-print.png'),
      fullPage: true,
    })
  })

  test('solicitud de reunión funciona desde el detalle', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await openFirstReportDetailOrSkip(page)

    const textarea = page.getByPlaceholder(/Mensaje opcional para tu consultor/i).first()
    await textarea.fill('Quiero revisar los gastos del mes')
    await page.getByRole('button', { name: /Solicitar reunión/i }).click()

    await expect(page.getByRole('button', { name: /Solicitud registrada/i })).toBeVisible()
    await expect(textarea).toBeDisabled()
    await expectNoVisibleErrors(page)
    await page.screenshot({
      path: screenshotPath('portal-meeting-requested.png'),
      fullPage: true,
    })
  })

  test('histórico muestra badges de estado con icono', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await openPortalOrSkip(page)

    const history = page.getByRole('heading', { name: /Histórico de informes publicados/i }).locator('..')
    await expect(history).toBeVisible()
    await expect(history.getByText(/Nuevo|Leído|Reunión solicitada|Reunión en preparación|Revisado/i).first()).toBeVisible()
    expect(await history.locator('svg').count()).toBeGreaterThan(0)
    await expectNoVisibleErrors(page)
    await page.screenshot({
      path: screenshotPath('portal-history-badges.png'),
      fullPage: true,
    })
  })

  test('navegación del portal funciona', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await openPortalOrSkip(page)

    await expect(page.getByRole('link', { name: /Inicio/i })).toHaveAttribute('href', '/portal')
    await expect(page.getByRole('link', { name: /Volver a ControlHub/i })).toBeVisible()
    await expect(page.locator('footer')).toContainText(String(new Date().getFullYear()))

    await openFirstReportDetailOrSkip(page)
    await expect(page).toHaveURL(/\/portal\/reports\//)
    await page.getByRole('link', { name: /Volver al portal/i }).click()
    await expect(page).toHaveURL(/\/portal$/)
    await expectNoVisibleErrors(page)
  })
})
