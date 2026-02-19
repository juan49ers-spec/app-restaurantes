-- CORRECCIÓN: Cambiar supplier_id de UUID a TEXT
-- Ejecutar ESTO PRIMERO (después del PASO 2)

-- Eliminar columna UUID y agregar columna TEXT
ALTER TABLE supplier_items DROP COLUMN IF EXISTS supplier_id;
ALTER TABLE supplier_items ADD COLUMN supplier_id TEXT;

-- Verificar cambio
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'supplier_items' 
  AND column_name = 'supplier_id';
