-- SOLUCIÓN: Recrear tabla recipe_ingredients
-- Ejecutar ESTO si el diagnóstico muestra que faltan columnas

-- Eliminar tabla incorrecta
DROP TABLE IF EXISTS recipe_ingredients CASCADE;

-- Recrear con TODAS las columnas correctas
CREATE TABLE recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL,  -- Esta es la columna que faltaba
    master_ingredient_id UUID NOT NULL,
    quantity_gross NUMERIC(10, 4),
    quantity_net NUMERIC(10, 4),
    yield_factor NUMERIC(4, 3),
    cost_at_time NUMERIC(10, 4),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (master_ingredient_id) REFERENCES master_ingredients(id)
);

-- Verificar que se creó correctamente
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'recipe_ingredients'
ORDER BY ordinal_position;
