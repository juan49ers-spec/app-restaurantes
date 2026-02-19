-- PASO 1: Crear TABLAS (CORREGIDO - supplier_id ahora es TEXT)
-- Ejecutar PRIMERO

-- 1. Master Ingredients
CREATE TABLE IF NOT EXISTS master_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    name TEXT NOT NULL,
    base_unit TEXT CHECK (base_unit IN ('kg', 'l', 'u')) NOT NULL DEFAULT 'kg',
    standard_waste_pct NUMERIC(4, 3) DEFAULT 0.000,
    current_avg_price NUMERIC(10, 2) DEFAULT 0.00,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Supplier Items (CORREGIDO: supplier_id ahora es TEXT)
CREATE TABLE IF NOT EXISTS supplier_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    supplier_id TEXT,  -- ✅ CAMBIADO de UUID a TEXT para aceptar 'SUPP-001', etc.
    name_on_invoice TEXT NOT NULL,
    sku_on_invoice TEXT,
    last_price NUMERIC(10, 2),
    pack_size NUMERIC(10, 2),
    master_ingredient_id UUID REFERENCES master_ingredients(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Recipes
CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    name TEXT NOT NULL,
    selling_price NUMERIC(10, 2),
    current_cost NUMERIC(10, 2) DEFAULT 0.00,
    target_margin_pct NUMERIC(5, 2),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Recipe Ingredients
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    master_ingredient_id UUID REFERENCES master_ingredients(id),
    quantity_gross NUMERIC(10, 4),
    quantity_net NUMERIC(10, 4),
    yield_factor NUMERIC(4, 3),
    cost_at_time NUMERIC(10, 4)
);

-- Verificar que las tablas se crearon
SELECT 
    tablename,
    'CREADA' AS status
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('master_ingredients', 'supplier_items', 'recipes', 'recipe_ingredients')
ORDER BY tablename;
