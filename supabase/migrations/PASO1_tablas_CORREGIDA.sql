-- RECREAR TABLA supplier_items con supplier_id como TEXT
-- Ejecutar ESTO en lugar de la ALTER anterior si prefieres recrear

-- Drop la tabla incorrecta
DROP TABLE IF EXISTS supplier_items CASCADE;

-- Recrear con supplier_id como TEXT
CREATE TABLE supplier_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    supplier_id TEXT,  -- CAMBIADO de UUID a TEXT
    name_on_invoice TEXT NOT NULL,
    sku_on_invoice TEXT,
    last_price NUMERIC(10, 2),
    pack_size NUMERIC(10, 2),
    master_ingredient_id UUID REFERENCES master_ingredients(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verificar que se creó correctamente
SELECT 'supplier_items recreada con supplier_id TEXT' AS status;
