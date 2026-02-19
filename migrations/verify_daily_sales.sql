-- =====================================================
-- VERIFICAR ESTRUCTURA DE DAILY_SALES
-- =====================================================

-- Consulta para verificar qué columnas existen actualmente
SELECT 
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'daily_sales'
    AND table_schema = 'public'
ORDER BY 
    ordinal_position;
