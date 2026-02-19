#!/usr/bin/env ts-node

import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

console.log("========================================")
console.log(" MÓDULO RESULTADOS - VERIFICACIÓN DE MIGRACIÓN")
console.log("========================================\n")

async function executeMigration() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    try {
        // 1. Leer el archivo de migración
        const migrationPath = path.join(__dirname, "../migrations/MIGRACION_COMPLETA_SQL.sql")
        const migrationSQL = fs.readFileSync(migrationPath, "utf-8")

        console.log("📄 Leyendo archivo de migración...")

        // 2. Ejecutar el SQL (separado en chunks si es necesario)
        // NOTA: Para mejor manejo de errores, esto se hace por partes
        const chunks = migrationSQL.split(";")

        console.log("⚡ Ejecutando migración SQL...")

        for (const chunk of chunks) {
            if (chunk.trim().length === 0) continue

            try {
                // Ejecutar cada chunk
                const { error } = await supabase.rpc("exec_sql", {
                    sql: chunk + ";"
                })

                if (error && error.message !== "Function exec_sql does not exist") {
                    console.error("⚠️  Error en chunk:", error.message)
                }
            } catch (err) {
                // Ignorar errores de chunks individuales
                if ((err as any).message?.includes("does not exist")) {
                    console.log("ℹ️  Algunos chunks no tienen funciones disponibles (esperado)")
                }
            }
        }

        console.log("✅ Migración SQL completada\n")

        // 3. Verificar tablas creadas
        console.log("📊 Verificando tablas creadas...")

        const { data: tables, error: tablesError } = await supabase
            .from("pg_tables")
            .select("tablename")
            .eq("schemaname", "public")
            .in("tablename", ["operating_expenses", "monthly_results"])

        if (tablesError) throw tablesError

        if (tables && tables.length >= 2) {
            console.log("✅ Tablas verificadas:")
            tables.forEach(t => console.log(`   - ${t.tablename}`))
        } else {
            console.error("❌ Error: No se crearon las tablas correctamente")
            return
        }

        // 4. Verificar funciones RPC
        console.log("\n🔧 Verificando funciones RPC...")

        const { data: functions, error: functionsError } = await supabase
            .from("pg_proc")
            .select("proname")
            .in("proname", ["calculate_monthly_results", "close_month", "update_updated_at_column"])

        if (functionsError) throw functionsError

        if (functions && functions.length >= 3) {
            console.log("✅ Funciones verificadas:")
            functions.forEach(f => console.log(`   - ${f.proname}`))
        } else {
            console.error("❌ Error: No se crearon las funciones RPC correctamente")
            return
        }

        // 5. Verificar índices
        console.log("\n📈 Verificando índices...")

        const { data: indexes, error: indexesError } = await supabase
            .from("pg_indexes")
            .select("indexname, tablename")
            .in("tablename", ["operating_expenses", "monthly_results"])

        if (indexesError) throw indexesError

        if (indexes && indexes.length >= 5) {
            console.log("✅ Índices verificados:")
            indexes.forEach(i => console.log(`   - ${i.indexname} (${i.tablename})`))
        } else {
            console.warn("⚠️  No se crearon algunos índices")
        }

        // 6. Verificar RLS policies
        console.log("\n🔒 Verificando RLS policies...")

        const { data: policies, error: policiesError } = await supabase
            .from("pg_policies")
            .select("policyname, tablename")
            .in("tablename", ["operating_expenses", "monthly_results"])

        if (policiesError) throw policiesError

        if (policies && policies.length >= 2) {
            console.log("✅ Policies verificadas:")
            policies.forEach(p => console.log(`   - ${p.policyname} (${p.tablename})`))
        }

        console.log("\n========================================")
        console.log("🎉 MIGRACIÓN COMPLETADA ÉXITOSAMENTE")
        console.log("========================================\n")

        console.log("📋 PRÓXIMOS PASOS:")
        console.log("1. Reemplaza YOUR_RESTAURANT_ID en el SQL de prueba")
        console.log("2. Inserta datos de prueba:")
        console.log("   - INSERT INTO operating_expenses (restaurant_id, expense_date, month_year, category, amount, description) VALUES")
        console.log("     ('TU_RESTAURANT_ID', '2026-01-15', '2026-01', 'personal', 12000, 'Sueldos enero'),")
        console.log("     ('TU_RESTAURANT_ID', '2026-01-10', '2026-01', 'materia_prima', 9500, 'Compra proveedor A'),")
        console.log("     ('TU_RESTAURANT_ID', '2026-01-05', '2026-01', 'materia_prima', 4200, 'Bebidas proveedor B'),")
        console.log("     ('TU_RESTAURANT_ID', '2026-01-20', '2026-01', 'suministros', 1800, 'Factura eléctrica');")
        console.log("")
        console.log("3. Cerrar mes de prueba:")
        console.log("   SELECT close_month('TU_RESTAURANT_ID', 2026, 1);")
        console.log("")
        console.log("4. Verificar resultados:")
        console.log("   SELECT * FROM monthly_results WHERE restaurant_id = 'TU_RESTAURANT_ID' AND month_year = '2026-01';")
        console.log("")

    } catch (error) {
        console.error("❌ Error durante la migración:", error)
        process.exit(1)
    }
}

executeMigration()
