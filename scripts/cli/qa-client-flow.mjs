#!/usr/bin/env node
/**
 * QA operativo del flujo consultor -> cliente.
 *
 * Por defecto ejecuta las pruebas deterministas de servidor/componentes.
 * Para QA visual con Playwright:
 *   RUN_VISUAL_QA=true npm run qa:client-flow
 *   QA_BASE_URL=https://app-finanzas-restaurante.vercel.app RUN_VISUAL_QA=true npm run qa:client-flow
 */

import { spawnSync } from 'node:child_process'
import { config as loadDotenv } from 'dotenv'

loadDotenv({ path: '.env.local', quiet: true })
loadDotenv({ path: '.env', quiet: true })

const baseEnv = {
  ...process.env,
  FORCE_COLOR: process.env.FORCE_COLOR ?? '1',
}

const deterministicSteps = [
  {
    label: 'Flujo completo consultor-cliente',
    command: 'npm',
    args: ['run', 'test', '--', 'tests/qa/full-delivery-flow.test.ts'],
  },
  {
    label: 'Actions de portal y anti-duplicado de reuniones',
    command: 'npm',
    args: ['run', 'test', '--', 'tests/portal/portal-actions.test.ts'],
  },
  {
    label: 'Workspace consultor, checklist y cartera',
    command: 'npm',
    args: ['run', 'test', '--', 'tests/consultant/consultant-actions.test.ts', 'tests/consultant/consultant-portfolio-actions.test.ts'],
  },
  {
    label: 'Componentes visibles de entrega',
    command: 'npm',
    args: [
      'run',
      'test',
      '--',
      'tests/components/PortalPremiumComponents.test.tsx',
      'tests/components/PortalReportSummary.test.tsx',
      'tests/components/DeliveryWorkflowPanel.test.tsx',
      'tests/components/ClientPortfolioPanel.test.tsx',
    ],
  },
]

function runStep(step) {
  console.log(`\n[QA] ${step.label}`)
  const isWindowsNpm = process.platform === 'win32' && step.command === 'npm'
  const command = isWindowsNpm ? 'cmd.exe' : step.command
  const args = isWindowsNpm
    ? ['/d', '/s', '/c', ['npm', ...step.args].join(' ')]
    : step.args
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: { ...baseEnv, ...step.env },
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    console.error(`\n[QA] Fallo en: ${step.label}`)
    process.exit(result.status ?? 1)
  }
}

function runVisualQaIfRequested() {
  if (process.env.RUN_VISUAL_QA !== 'true') {
    console.log('\n[QA] QA visual omitida. Usa RUN_VISUAL_QA=true para ejecutar Playwright.')
    console.log('[QA] Para producción: QA_BASE_URL=https://app-finanzas-restaurante.vercel.app RUN_VISUAL_QA=true npm run qa:client-flow')
    return
  }

  runStep({
    label: 'QA visual del portal cliente con Playwright',
    command: 'npm',
    args: ['run', 'test:e2e', '--', 'tests/e2e/portal-visual-qa.spec.ts'],
    env: {
      BASE_URL: process.env.QA_BASE_URL ?? process.env.BASE_URL ?? `http://127.0.0.1:${process.env.E2E_PORT ?? '3100'}`,
    },
  })
}

console.log('[QA] Iniciando QA del flujo consultor -> cliente')

for (const step of deterministicSteps) {
  runStep(step)
}

runVisualQaIfRequested()
console.log('\n[QA] Flujo consultor -> cliente verificado.')
