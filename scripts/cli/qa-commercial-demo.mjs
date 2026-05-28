#!/usr/bin/env node
/**
 * QA comercial antes de enseñar la app.
 *
 * Ejecuta el flujo consultor -> cliente y valida que el propio comando de demo
 * siga incluyendo las piezas que se enseñan: asistente de primer informe,
 * portal cliente, solicitud de reunión y componentes visibles de entrega.
 */

import { spawnSync } from 'node:child_process'
import { config as loadDotenv } from 'dotenv'

loadDotenv({ path: '.env.local', quiet: true })
loadDotenv({ path: '.env', quiet: true })

function run(label, command, args) {
  console.log(`\n[DEMO QA] ${label}`)
  const isWindowsNpm = process.platform === 'win32' && command === 'npm'
  const executable = isWindowsNpm ? 'cmd.exe' : command
  const finalArgs = isWindowsNpm
    ? ['/d', '/s', '/c', ['npm', ...args].join(' ')]
    : args

  const result = spawnSync(executable, finalArgs, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      FORCE_COLOR: process.env.FORCE_COLOR ?? '1',
    },
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    console.error(`\n[DEMO QA] Fallo en: ${label}`)
    process.exit(result.status ?? 1)
  }
}

console.log('[DEMO QA] Validando demo comercial consultor -> cliente')

run('Flujo funcional completo', 'npm', ['run', 'qa:client-flow'])
run('Guardia de preparación comercial', 'npm', ['run', 'test', '--', 'tests/qa/commercial-demo-readiness.test.ts'])

console.log('\n[DEMO QA] Demo comercial lista para enseñar.')
