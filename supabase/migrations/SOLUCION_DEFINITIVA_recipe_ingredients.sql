-- SOLUCIÓN DEFINITIVA: Recrear recipe_ingredients con el schema correcto
-- Esto eliminará la tabla antigua y la creará con el nuevo modelo

-- Eliminar tabla antigua (con el schema incorrecto)
DROP TABLE IF EXISTS recipe_ingredients CASCADE;

-- Crear tabla con el NUEVO schema (Master Ingredients + Recipes)
CREATE TABLE recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL,  -- ✅ NUEVO: Apunta a recipes
    master_ingredient_id UUID NOT NULL,  -- ✅ NUEVO: Apunta a master_ingredients
    quantity_gross NUMERIC(10, 4),  -- ✅ Cantidad bruta (comprada)
    quantity_net NUMERIC(10, 4),  -- ✅ Cantidad neta (después de merma)
    yield_factor NUMERIC(4, 3),  -- ✅ Factor de rendimiento (1 - waste_pct)
    cost_at_time NUMERIC(10, 4),  -- ✅ Snapshot del costo
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (master_ingredient_id) REFERENCES master_ingredients(id)
);

-- Verificar que se creó correctamente
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'recipe_ingredients'
ORDER BY ordinal_position;
