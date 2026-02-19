#!/usr/bin/env tsx
/**
 * Script CLI: Clean Old Logs
 * 
 * Uso: npm run maintenance:clean-logs
 */

import { cleanupOldLogs } from '../../src/lib/scripts/maintenance'

async function main() {
    const days = process.argv[2] ? parseInt(process.argv[2]) : 90
    
    console.log(`🧹 Limpiando logs antiguos (últimos ${days} días)...\n`)

    const result = await cleanupOldLogs(days)

    if (result.success) {
        console.log('✅', result.message)
        console.log(`   - Alertas eliminadas: ${result.deletedAlerts}`)
        console.log(`   - Logs eliminados: ${result.deletedLogs}`)
        process.exit(0)
    } else {
        console.error('❌', result.message)
        process.exit(1)
    }
}

main()
