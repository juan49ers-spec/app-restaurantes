-- Optimización de Índices PostgreSQL para ControlHub
-- Basado en Supabase Postgres Best Practices
-- Fecha: 2025-03-03

-- =====================================================
-- 1. ÍNDICES PARA TABLAS PRINCIPALES
-- =====================================================

-- daily_sales: Mejorar consultas por rango de fechas y restaurant
CREATE INDEX IF NOT EXISTS idx_daily_sales_restaurant_date 
ON daily_sales(restaurant_id, sale_date DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_daily_sales_date_range 
ON daily_sales(sale_date DESC, restaurant_id) 
WHERE deleted_at IS NULL;

-- operating_expenses: Optimizar consultas financieras
CREATE INDEX IF NOT EXISTS idx_operating_expenses_restaurant_date 
ON operating_expenses(restaurant_id, expense_date DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_operating_expenses_category 
ON operating_expenses(category, expense_date DESC) 
WHERE deleted_at IS NULL;

-- =====================================================
-- 2. ÍNDICES PARA RECETAS E INGREDIENTES
-- =====================================================

-- recipes: Búsquedas frecuentes por restaurant
CREATE INDEX IF NOT EXISTS idx_recipes_restaurant 
ON recipes(restaurant_id) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_recipes_category 
ON recipes(category, restaurant_id) 
WHERE deleted_at IS NULL;

-- ingredients: Búsquedas por nombre y restaurant
CREATE INDEX IF NOT EXISTS idx_ingredients_restaurant 
ON ingredients(restaurant_id) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ingredients_name_trgm 
ON ingredients USING gin(name gin_trgm_ops) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ingredients_category 
ON ingredients(category, restaurant_id) 
WHERE deleted_at IS NULL;

-- =====================================================
-- 3. ÍNDICES PARA FACTURAS (INVOICES)
-- =====================================================

-- invoices: Consultas por estado y fechas
CREATE INDEX IF NOT EXISTS idx_invoices_restaurant_status 
ON invoices(restaurant_id, status, invoice_date DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_supplier 
ON invoices(supplier_id, invoice_date DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_total_amount 
ON invoices(total_amount DESC) 
WHERE deleted_at IS NULL;

-- =====================================================
-- 4. ÍNDICES PARA STOCK Y DESPERDICIOS
-- =====================================================

-- inventory_transactions: Consultas recientes
CREATE INDEX IF NOT EXISTS idx_inventory_restaurant_date 
ON inventory_transactions(restaurant_id, transaction_date DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_ingredient 
ON inventory_transactions(ingredient_id, transaction_date DESC) 
WHERE deleted_at IS NULL;

-- waste_records: Seguimiento de desperdicios
CREATE INDEX IF NOT EXISTS idx_waste_restaurant_date 
ON waste_records(restaurant_id, waste_date DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_waste_ingredient 
ON waste_records(ingredient_id, waste_date DESC) 
WHERE deleted_at IS NULL;

-- =====================================================
-- 5. ÍNDICES PARA PERSONAL (STAFF)
-- =====================================================

-- employees: Búsquedas activas
CREATE INDEX IF NOT EXISTS idx_employees_restaurant_active 
ON employees(restaurant_id, is_active, employee_id) 
WHERE deleted_at IS NULL;

-- shifts: Consultas por rango de fechas
CREATE INDEX IF NOT EXISTS idx_shifts_restaurant_date 
ON shifts(restaurant_id, shift_date DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_shifts_employee 
ON shifts(employee_id, shift_date DESC) 
WHERE deleted_at IS NULL;

-- =====================================================
-- 6. ÍNDICES PARA PRECIOS E HISTORIAL
-- =====================================================

-- price_history: Seguimiento de cambios
CREATE INDEX IF NOT EXISTS idx_price_history_ingredient_date 
ON price_history(ingredient_id, recorded_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_price_history_restaurant 
ON price_history(restaurant_id, recorded_at DESC) 
WHERE deleted_at IS NULL;

-- =====================================================
-- 7. ÍNDICES PARCIALES PARA FILTROS COMUNES
-- =====================================================

-- Solo registros activos para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_daily_sales_active_only 
ON daily_sales(restaurant_id, sale_date DESC) 
WHERE deleted_at IS NULL AND sale_date >= CURRENT_DATE - INTERVAL '90 days';

CREATE INDEX IF NOT EXISTS idx_invoices_pending 
ON invoices(restaurant_id, invoice_date DESC) 
WHERE deleted_at IS NULL AND status IN ('pending', 'under_review');

-- =====================================================
-- 8. ÍNDICES DE TEXTO PARA BÚSQUEDAS
-- =====================================================

-- Habilitar extensión pg_trgm si no existe
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índices de búsqueda全文 para nombres
CREATE INDEX IF NOT EXISTS idx_recipes_name_trgm 
ON recipes USING gin(name gin_trgm_ops) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ingredients_name_trgm 
ON ingredients USING gin(name gin_trgm_ops) 
WHERE deleted_at IS NULL;

-- =====================================================
-- 9. ÍNDICES PARA ANÁLISIS Y REPORTES
-- =====================================================

-- Optimizar joins frecuentes
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe 
ON recipe_ingredients(recipe_id) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient 
ON recipe_ingredients(ingredient_id) 
WHERE deleted_at IS NULL;

-- =====================================================
-- 10. ESTADÍSTICAS POST-CREACIÓN
-- =====================================================

-- Actualizar estadísticas del optimizador
ANALYZE daily_sales;
ANALYZE operating_expenses;
ANALYZE recipes;
ANALYZE ingredients;
ANALYZE invoices;
ANALYZE inventory_transactions;
ANALYZE waste_records;
ANALYZE employees;
ANALYZE shifts;
ANALYZE price_history;

-- =====================================================
-- COMENTARIOS DE OPTIMIZACIÓN
-- =====================================================

-- Recomendaciones adicionales:
-- 1. Monitorear consultas lentas con pg_stat_statements
-- 2. Revisar planes de ejecución con EXPLAIN ANALYZE
-- 3. Considerar CLUSTER para tablas muy grandes
-- 4. Configurar autovacuum agresivo para tablas con alta rotación
-- 5. Usar CONCURRENTLY para crear índices en producción sin bloqueos