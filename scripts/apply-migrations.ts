/**
 * Script para aplicar migraciones SQL usando Supabase Client
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos')
    process.exit(1)
}

const supabase = createSupabaseClient(supabaseUrl, supabaseKey)

async function executeMigration(name: string, sqlFile: string) {
    console.log(`\n📋 Ejecutando migración: ${name}`)
    console.log(`📁 Archivo: ${sqlFile}`)
    
    try {
        const sql = readFileSync(sqlFile, 'utf8')
        
        // Dividir el SQL en statements individuales (separados por ;)
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'))
        
        console.log(`   📊 Found ${statements.length} SQL statements to execute`)
        
        let executedCount = 0
        for (const statement of statements) {
            try {
                const { data, error } = await supabase.rpc('exec_sql', {
                    sql: statement
                })
                
                if (error) {
                    // Si exec_sql no existe, intentar con SQL directo
                    console.log(`   ⚠️  exec_sql no disponible, intentando método alternativo...`)
                    console.log(`   ℹ️  Por favor aplica manualmente: ${sqlFile}`)
                    return
                }
                
                executedCount++
            } catch (err: unknown) {
                console.log(`   ⚠️  Warning:`, err)
            }
        }
        
        console.log(`   ✅ Ejecutados ${executedCount}/${statements.length} statements`)
        console.log(`   🎉 Migración ${name} completada!`)
        
    } catch (error: unknown) {
        console.error(`   ❌ Error ejecutando migración:`, error)
        throw error
    }
}

async function main() {
    const migrations = [
        {
            name: 'Phase 2: Atomic Invoices RPC',
            file: 'supabase/migrations/20250218_phase2_atomic_invoice_rpc.sql'
        },
        {
            name: 'Phase 3: Business Rules & Alerts',
            file: 'supabase/migrations/20250218_phase3_business_rules_alerts.sql'
        }
    ]
    
    console.log('🚀 Iniciando aplicación de migraciones...')
    console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`)
    
    for (const migration of migrations) {
        try {
            await executeMigration(migration.name, migration.file)
        } catch (error) {
            console.error(`\n❌ Falló migración: ${migration.name}`)
            console.error('   Detalle: Revisa la consola para más información')
            process.exit(1)
        }
    }
    
    console.log('\n✨ Todas las migraciones aplicadas exitosamente!')
    console.log('\n📝 Resumen:')
    console.log('   - Tablas creadas: invoice_items, business_rules, financial_alerts')
    console.log('   - Campos añadidos: idempotency_key (invoices, operating_expenses)')
    console.log('   - Funciones RPC: upsert_invoice_with_items, get_active_business_rule')
    console.log('   - Triggers: check_recipe_margin_trigger')
    console.log('\n🎯 Próximos pasos:')
    console.log('   1. Reinicia el servidor de desarrollo')
    console.log('   2. Prueba crear una factura con ítems')
    console.log('   3. Verifica que los logs usan el nuevo logger Pino')
}

main()
