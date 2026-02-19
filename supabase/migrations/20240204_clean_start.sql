-- CLEAN START: Eliminar tablas existentes y crear desde cero
-- ⚠️  Esto BORRARÁ todos los datos existentes

-- Drop en orden inverso por foreign keys
DROP TABLE IF EXISTS recipe_ingredients CASCADE;
DROP TABLE IF EXISTS supplier_items CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS master_ingredients CASCADE;

-- Drop funciones y triggers
DROP FUNCTION IF EXISTS calculate_recipe_cost CASCADE;
DROP FUNCTION IF EXISTS update_recipe_costs_trigger CASCADE;
DROP TRIGGER IF EXISTS trigger_update_costs_on_ingredient_change ON master_ingredients;

-- 1. Master Ingredients (The Truth)
CREATE TABLE master_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    name TEXT NOT NULL,
    base_unit TEXT CHECK (base_unit IN ('kg', 'l', 'u')) NOT NULL DEFAULT 'kg',
    standard_waste_pct NUMERIC(4, 3) DEFAULT 0.000,
    current_avg_price NUMERIC(10, 2) DEFAULT 0.00,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Supplier Items (The Memory)
CREATE TABLE supplier_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    supplier_id UUID,
    name_on_invoice TEXT NOT NULL,
    sku_on_invoice TEXT,
    last_price NUMERIC(10, 2),
    pack_size NUMERIC(10, 2),
    master_ingredient_id UUID REFERENCES master_ingredients(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Recipes (Escandallos)
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    name TEXT NOT NULL,
    selling_price NUMERIC(10, 2),
    current_cost NUMERIC(10, 2) DEFAULT 0.00,
    target_margin_pct NUMERIC(5, 2),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Recipe Ingredients (The Link)
CREATE TABLE recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    master_ingredient_id UUID REFERENCES master_ingredients(id),
    quantity_gross NUMERIC(10, 4),
    quantity_net NUMERIC(10, 4),
    yield_factor NUMERIC(4, 3),
    cost_at_time NUMERIC(10, 4)
);

-- 5. Logic: Update Recipe Costs
CREATE OR REPLACE FUNCTION calculate_recipe_cost(recipe_uuid UUID) RETURNS NUMERIC AS $$
DECLARE total NUMERIC := 0;
BEGIN
    SELECT COALESCE(SUM(mi.current_avg_price * ri.quantity_gross), 0)
    INTO total
    FROM recipe_ingredients ri
    JOIN master_ingredients mi ON ri.master_ingredient_id = mi.id
    WHERE ri.recipe_id = recipe_uuid;
    RETURN total;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_recipe_costs_trigger() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        IF (NEW.current_avg_price <> OLD.current_avg_price) THEN
            UPDATE recipes
            SET current_cost = calculate_recipe_cost(id),
                updated_at = NOW()
            WHERE id IN (
                SELECT recipe_id
                FROM recipe_ingredients
                WHERE master_ingredient_id = NEW.id
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_costs_on_ingredient_change
AFTER UPDATE ON master_ingredients
FOR EACH ROW
EXECUTE FUNCTION update_recipe_costs_trigger();

-- Confirmación
SELECT 'Schema creado exitosamente' AS status;
