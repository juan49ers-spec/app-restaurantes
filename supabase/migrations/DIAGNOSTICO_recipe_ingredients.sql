-- DIAGNÓSTICO: Verificar columnas de recipe_ingredients
-- Ejecutar PRIMERO para ver qué existe

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'recipe_ingredients'
ORDER BY ordinal_position;

-- Si la tabla está vacía o no tiene las columnas correctas,
-- necesitaremos recrearla
