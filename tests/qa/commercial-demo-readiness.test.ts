import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('commercial demo readiness', () => {
  it('exposes a dedicated QA command for the client demo', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>
    }

    expect(packageJson.scripts['qa:commercial-demo']).toBe('node scripts/cli/qa-commercial-demo.mjs')
  })

  it('keeps the consultant and client guidance tests in the demo QA flow', () => {
    const script = readFileSync('scripts/cli/qa-client-flow.mjs', 'utf8')

    expect(script).toContain('tests/consultant/first-report-guide.test.ts')
    expect(script).toContain('tests/components/FirstReportGuidePanel.test.tsx')
    expect(script).toContain('tests/portal/portal-client-review-plan.test.ts')
    expect(script).toContain('tests/components/PortalClientReviewPlan.test.tsx')
  })
})
