import { defineConfig, devices } from '@playwright/test'

const defaultE2ePort = process.env.E2E_PORT ?? '3100'
const baseURL = process.env.BASE_URL ?? `http://127.0.0.1:${defaultE2ePort}`
const parsedBaseURL = new URL(baseURL)
const isLocalBaseURL = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(parsedBaseURL.hostname)
const webServerPort = parsedBaseURL.port || (parsedBaseURL.protocol === 'https:' ? '443' : '80')

/**
 * Playwright configuration for E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: '.',
  testMatch: ['e2e/**/*.spec.ts', 'tests/e2e/**/*.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 15000,
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-web-security'],
        },
      },
    },
  ],

  webServer: isLocalBaseURL
    ? {
        command: `npm run build && npx next start -p ${webServerPort}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 300000,
        env: {
          NODE_ENV: 'production',
        },
      }
    : undefined,
})
