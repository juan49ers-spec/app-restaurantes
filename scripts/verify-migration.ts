#!/usr/bin/env ts-node

import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"

// Cargar variables de entorno desde .env.local
const envPath = path.join(process.cwd(), ".env.local")
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8")
    envContent.split("\n").forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/)
        if (match) {
            const key = match[1].trim()
            const value = match[2].trim()
            if (key.startsWith("NEXT_PUBLIC_")) {
                process.env[key] = value
            }
        }
    })
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

console.log("========================================")
console.log(" MÓDULO RESULTADOS - VERIFICACIÓN FINAL")
console.log("========================================\n")

async function verifyMigration() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    try {
        // 1. Verificar tablas creadas
        console.log("📊 Verificando tablas creadas...")

        const { data: tables, error: tablesError } = await supabase
            .from("pg_tables")
            .select("tablename")
            .eq("schemaname", "public")
            .in("tablename", ["operating_expenses", "monthly_results", "monthly_targets"])

        if (tablesError) throw tablesError

        if (tables && tables.length >= 3) {
            console.log("✅ Tablas verificadas:")
            tables.forEach(t => console.log(`   - ${t.tablename}`))
        } else {
            console.error("❌ Error: No se crearon las tablas correctamente")
            return
        }

        // 2. Verificar funciones RPC
        console.log("\n🔧 Verificando funciones RPC...")

        const { data: functions, error: functionsError } = await supabase
            .from("pg_proc")
            .select("proname")
            .in("proname", ["calculate_monthly_results", "close_month", "trg_populate_month_year"])

        if (functionsError) throw functionsError

        if (functions && functions.length >= 3) {
            console.log("✅ Funciones verificadas:")
            functions.forEach(f => console.log(`   - ${f.proname}`))
        } else {
            console.error("❌ Error: No se crearon las funciones RPC correctamente")
            return
        }

        // 3. Verificar índices
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
            console.warn("⚠️  No se crearon todos los índices")
        }

        // 4. Verificar RLS policies
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

        // 5. Verificar trigger
        console.log("\n⚡ Verificando triggers...")

        const { data: triggers, error: triggersError } = await supabase
            .from("pg_trigger")
            .select("tgname, tgrelid::regclass")
            .eq("tgname", "trg_populate_month_year")

        if (triggersError) throw triggersError

        if (triggers && triggers.length > 0) {
            console.log("✅ Trigger verificado:")
            triggers.forEach(t => console.log(`   - ${t.tgname} en ${t.tgrelid}`))
        }

        console.log("\n========================================")
        console.log("🎉 MIGRACIÓN EXITOSAMENTE VERIFICADA")
        console.log("========================================\n")

        console.log("📋 PASOS SIGUIENTES:")
        console.log("1. Obtener tu Restaurant ID:")
        console.log("   SELECT id FROM restaurants LIMIT 1;")
        console.log("")
        console.log("2. Insertar datos de prueba en operating_expenses:")
        console.log("   INSERT INTO operating_expenses (restaurant_id, expense_date, category, amount, description) VALUES")
        console.log("     ('TU_RESTAURANT_ID', '2026-01-15', 'personal', 12000, 'Sueldos'),")
        console.log("     ('TU_RESTAURANT_ID', '2026-01-10', 'materia_prima', 9500, 'Compra proveedor'),")
        console.log("     ('TU_RESTAURANT_ID', '2026-01-05', 'materia_prima', 4200, 'Bebidas'),")
        console.log("     ('TU_RESTAURANT_ID', '2026-01-20', 'suministros', 1800, 'Eléctrica'),")
        console.log("     ('TU_RESTAURANT_ID', '2026-01-12', 'mantenimiento', 1200, 'Reparación nevera'),")
        console.log("     ('TU_RESTAURANT_ID', '2026-01-18', 'marketing', 1500, 'Publicidad Facebook');")
        console.log("")
        console.log("3. Cerrar mes:")
        console.log("   SELECT close_month('TU_RESTAURANT_ID', 2026, 1);")
        console.log("")
        console.log("4. Verificar resultados:")
        console.log("   SELECT * FROM monthly_results WHERE month_year = '2026-01';")
        console.log("")

    } catch (error) {
        console.error("❌ Error durante la verificación:", error)
        process.exit(1)
    }
}

verifyMigration()
