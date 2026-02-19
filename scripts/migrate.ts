import { readFileSync } from 'fs'
import { join } from 'path'

async function executeSQLFile(filename: string) {
    const filePath = join(process.cwd(), 'supabase', 'migrations', filename)
    console.log(`\n📄 Reading ${filename}...`)
    
    const sql = readFileSync(filePath, 'utf-8')
    return sql
}

async function main() {
    console.log('🎯 Control Hub - Migration Instructions (CORREGIDAS)')
    console.log('=====================================================\n')
    
    console.log('✅ Los archivos SQL han sido corregidos (eliminados encabezados #)\n')
    
    console.log('📋 STEP 0: CREAR TABLAS (PRIMERO)')
    console.log('🔗 URL: https://supabase.com/dashboard/project/xfuifpthzsywokagwggo/sql\n')
    
    const initialSQL = await executeSQLFile('20240101_initial_schema.sql')
    console.log('--- COPIAR Y EJECUTAR ESTO PRIMERO ---')
    console.log(initialSQL)
    console.log('--- FIN STEP 0 ---\n')
    
    console.log('\n📋 STEP 1: HABILITAR RLS POLICIES (SEGUNDO)')
    console.log('⚠️  Ejecutar DESPUÉS de que el STEP 0 sea exitoso\n')
    
    const rlsSQL = await executeSQLFile('20240204_add_rls_policies.sql')
    console.log('--- COPIAR Y EJECUTAR ESTO SEGUNDO ---')
    console.log(rlsSQL)
    console.log('--- FIN STEP 1 ---\n')
    
    console.log('\n📋 STEP 2: INSERTAR SEED DATA (TERCERO)')
    console.log('⚠️  PRIMERO reemplaza 550e8400-e29b-41d4-a716-446655440000 con tu restaurant_id real')
    console.log('    Tu restaurant_id está en: auth.users -> raw_user_meta_data -> restaurant_id\n')
    
    const seedSQL = await executeSQLFile('20240204_seed_data.sql')
    
    console.log('--- COPIAR Y REEMPLAZAR UUID, LUEGO EJECUTAR ---')
    console.log(seedSQL)
    console.log('--- FIN STEP 2 ---\n')
    
    console.log('\n✅ ¡Archivos SQL corregidos y listos!')
    console.log('\n📝 ORDEN CORRECTO:')
    console.log('   1. Abrir: https://supabase.com/dashboard/project/xfuifpthzsywokagwggo/sql')
    console.log('   2. Copiar y ejecutar STEP 0 (Crear Tablas) - ESPERAR éxito')
    console.log('   3. Copiar y ejecutar STEP 1 (RLS Policies) - ESPERAR éxito')
    console.log('   4. En STEP 2, reemplazar el UUID con tu restaurant_id')
    console.log('   5. Copiar y ejecutar STEP 2 (Seed Data)')
    console.log('\n🧪 PARA PROBAR EL TRIGGER:')
    console.log("   UPDATE master_ingredients SET current_avg_price = 3.00 WHERE name = 'Tomate Pera';")
    console.log("   SELECT * FROM recipes WHERE name = 'Macarrones con Tomate';")
    console.log('   -- El current_cost debería haberse actualizado automáticamente!')
}

main().catch(console.error)
