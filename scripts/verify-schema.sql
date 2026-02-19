-- ==========================================
-- VERIFICACIÓN RÁPIDA DE MIGRACIÓN
-- Ejecutar en: Supabase SQL Editor
-- ==========================================

-- 1. Ver tablas creadas
SELECT 'TABLAS' as type, tablename as name FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('operating_expenses', 'monthly_results', 'monthly_targets')
ORDER BY tablename;

-- 2. Ver funciones RPC creadas
SELECT 'FUNCIONES' as type, proname as name FROM pg_proc
WHERE proname IN ('calculate_monthly_results', 'close_month', 'trg_populate_month_year')
ORDER BY proname;

-- 3. Ver índices creados
SELECT 'INDICES' as type, indexname as name, tablename
FROM pg_indexes
WHERE tablename IN ('operating_expenses', 'monthly_results', 'monthly_targets')
ORDER BY tablename, indexname;

-- 4. Ver policies RLS creadas
SELECT 'POLICIES' as type, policyname as name, tablename
FROM pg_policies
WHERE tablename IN ('operating_expenses', 'monthly_results', 'monthly_targets')
ORDER BY tablename, policyname;

-- 5. Ver triggers creados
SELECT 'TRIGGERS' as type, tgname as name, tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgname IN ('trg_populate_month_year', 'update_expenses', 'update_results')
ORDER BY tgname;

-- 6. Ver estructura de tabla operating_expenses
SELECT 'ESTRUCTURA OPERATING_EXPENSES' as type, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'operating_expenses'
ORDER BY ordinal_position;

-- 7. Ver estructura de tabla monthly_results
SELECT 'ESTRUCTURA MONTHLY_RESULTS' as type, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'monthly_results'
ORDER BY ordinal_position;

-- 8. Ver estructura de tabla monthly_targets
SELECT 'ESTRUCTURA MONTHLY_TARGETS' as type, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'monthly_targets'
ORDER BY ordinal_position;
