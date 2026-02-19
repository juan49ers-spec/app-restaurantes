#!/usr/bin/env tsx
/**
 * Script CLI: Vacuum Database
 * 
 * Uso: npm run maintenance:vacuum
 */

import { vacuumAnalyzeTables } from '../../src/lib/scripts/maintenance'

async function main() {
    console.log('🧹 Iniciando VACUUM ANALYZE de base de datos...\n')

    const result = await vacuumAnalyzeTables()

    if (result.success) {
        console.log('✅', result.message)
        process.exit(0)
    } else {
        console.error('❌', result.message)
        process.exit(1)
    }
}

main()
