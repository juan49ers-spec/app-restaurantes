#!/usr/bin/env tsx
/**
 * Script CLI: Health Check
 * 
 * Uso: npm run maintenance:health-check
 */

import { healthCheck } from '../../src/lib/scripts/maintenance'

async function main() {
    console.log('🏥 Ejecutando health checks del sistema...\n')

    const result = await healthCheck()

    console.log('Estado General:', result.overallStatus.toUpperCase())
    console.log('\nChecks:')

    for (const [name, status] of Object.entries(result.checks)) {
        const icon = status === true ? '✅' : status === false ? '❌' : '⚠️ '
        console.log(`  ${icon} ${name}:`, status)
    }

    if (result.overallStatus === 'unhealthy') {
        console.log('\n❌ Sistema no saludable - Requiere atención')
        process.exit(1)
    } else if (result.overallStatus === 'degraded') {
        console.log('\n⚠️  Sistema degradado - Algunos servicios fallando')
        process.exit(0)
    } else {
        console.log('\n✅ Sistema saludable')
        process.exit(0)
    }
}

main()
