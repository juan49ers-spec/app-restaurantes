import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

describe('E2E credential hygiene', () => {
  it('does not hardcode portal QA credentials in Playwright tests', () => {
    const testPath = path.join(process.cwd(), 'tests', 'e2e', 'portal-visual-qa.spec.ts')
    const source = readFileSync(testPath, 'utf8')

    expect(source).not.toMatch(/E2E_EMAIL\s*=\s*process\.env\.E2E_EMAIL\s*\?\?/)
    expect(source).not.toMatch(/E2E_PASSWORD\s*=\s*process\.env\.E2E_PASSWORD\s*\?\?/)
    expect(source).not.toMatch(/fill\(['"][^'"]+@[^'"]+['"]\)/)
    expect(source).toContain('process.env.E2E_EMAIL')
    expect(source).toContain('process.env.E2E_PASSWORD')
  })
})
