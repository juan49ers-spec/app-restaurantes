-- DIAGNÓSTICO: Verificar qué tablas existen
-- Ejecutar esto PRIMERO para ver el estado actual

SELECT 
    tablename,
    schemaname
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'master_ingredients',
        'supplier_items',
        'recipes',
        'recipe_ingredients'
    )
ORDER BY tablename;

-- Verificar si existen las funciones
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name LIKE '%recipe%cost%'
ORDER BY routine_name;

-- Verificar si existen triggers
SELECT 
    trigger_name,
    event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
    AND trigger_name LIKE '%recipe%'
ORDER BY trigger_name;
