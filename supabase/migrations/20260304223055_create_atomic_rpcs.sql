-- Función RPC para upsert de facturas con ítems en una transacción
CREATE OR REPLACE FUNCTION upsert_invoice_with_items(
        p_invoice_id UUID,
        p_restaurant_id UUID,
        p_supplier_id UUID,
        p_invoice_number TEXT,
        p_invoice_date DATE,
        p_total_amount NUMERIC,
        p_tax_amount NUMERIC,
        p_items JSONB
    ) RETURNS TABLE(
        success BOOLEAN,
        invoice_id UUID,
        error_message TEXT
    ) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_item JSONB;
v_invoice_id UUID;
BEGIN -- Validar que el restaurante existe
IF NOT EXISTS (
    SELECT 1
    FROM restaurants
    WHERE id = p_restaurant_id
) THEN RETURN QUERY
SELECT false,
    NULL::UUID,
    'Restaurant not found';
RETURN;
END IF;
v_invoice_id := COALESCE(p_invoice_id, gen_random_uuid());
-- Upsert de la factura
INSERT INTO invoices (
        id,
        restaurant_id,
        supplier_id,
        invoice_number,
        invoice_date,
        total_amount,
        tax_amount,
        status
    )
VALUES (
        v_invoice_id,
        p_restaurant_id,
        p_supplier_id,
        p_invoice_number,
        p_invoice_date,
        p_total_amount,
        COALESCE(p_tax_amount, 0),
        'PENDING_VALIDATION'
    ) ON CONFLICT (id) DO
UPDATE
SET supplier_id = EXCLUDED.supplier_id,
    invoice_number = EXCLUDED.invoice_number,
    invoice_date = EXCLUDED.invoice_date,
    total_amount = EXCLUDED.total_amount,
    tax_amount = EXCLUDED.tax_amount,
    updated_at = NOW();
-- Eliminar ítems anteriores para reemplazarlos (si es actualización)
DELETE FROM invoice_items
WHERE invoice_items.invoice_id = v_invoice_id;
-- Insertar nuevos ítems
FOR v_item IN
SELECT *
FROM jsonb_array_elements(p_items) LOOP
INSERT INTO invoice_items (
        id,
        invoice_id,
        description,
        quantity,
        unit_price,
        total_price
    )
VALUES (
        gen_random_uuid(),
        v_invoice_id,
        v_item->>'description',
        (v_item->>'quantity')::NUMERIC,
        (v_item->>'unit_price')::NUMERIC,
        (v_item->>'total_price')::NUMERIC
    );
END LOOP;
-- Retornar éxito
RETURN QUERY
SELECT true,
    v_invoice_id,
    NULL::TEXT;
EXCEPTION
WHEN OTHERS THEN -- Log del error
RAISE NOTICE 'Error in upsert_invoice_with_items: %',
SQLERRM;
RETURN QUERY
SELECT false,
    NULL::UUID,
    SQLERRM;
END;
$$;
-- Grant permissions
GRANT EXECUTE ON FUNCTION upsert_invoice_with_items TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_invoice_with_items TO anon;
-- Función RPC para upsert de recetas con ingredientes en una transacción
CREATE OR REPLACE FUNCTION upsert_recipe_with_ingredients(
        p_recipe_id UUID,
        p_restaurant_id UUID,
        p_name TEXT,
        p_category TEXT,
        p_prep_time_minutes INTEGER,
        p_cost NUMERIC,
        p_price NUMERIC,
        p_margin_percentage NUMERIC,
        p_ingredients JSONB
    ) RETURNS TABLE(
        success BOOLEAN,
        recipe_id UUID,
        error_message TEXT
    ) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_item JSONB;
v_recipe_id UUID;
BEGIN -- Validar que el restaurante existe
IF NOT EXISTS (
    SELECT 1
    FROM restaurants
    WHERE id = p_restaurant_id
) THEN RETURN QUERY
SELECT false,
    NULL::UUID,
    'Restaurant not found';
RETURN;
END IF;
v_recipe_id := COALESCE(p_recipe_id, gen_random_uuid());
-- Upsert de la receta
INSERT INTO recipes (
        id,
        restaurant_id,
        name,
        category,
        prep_time_minutes,
        cost,
        price,
        margin_percentage
    )
VALUES (
        v_recipe_id,
        p_restaurant_id,
        p_name,
        p_category,
        COALESCE(p_prep_time_minutes, 0),
        COALESCE(p_cost, 0),
        COALESCE(p_price, 0),
        COALESCE(p_margin_percentage, 0)
    ) ON CONFLICT (id) DO
UPDATE
SET name = EXCLUDED.name,
    category = EXCLUDED.category,
    prep_time_minutes = EXCLUDED.prep_time_minutes,
    cost = EXCLUDED.cost,
    price = EXCLUDED.price,
    margin_percentage = EXCLUDED.margin_percentage,
    updated_at = NOW();
-- Eliminar ingredientes anteriores (si es actualización)
DELETE FROM recipe_ingredients
WHERE recipe_ingredients.recipe_id = v_recipe_id;
-- Insertar nuevos ingredientes
FOR v_item IN
SELECT *
FROM jsonb_array_elements(p_ingredients) LOOP
INSERT INTO recipe_ingredients (
        id,
        recipe_id,
        ingredient_id,
        quantity_used,
        cost_contribution
    )
VALUES (
        gen_random_uuid(),
        v_recipe_id,
        (v_item->>'ingredient_id')::UUID,
        (v_item->>'quantity_used')::NUMERIC,
        COALESCE((v_item->>'cost_contribution')::NUMERIC, 0)
    );
END LOOP;
-- Retornar éxito
RETURN QUERY
SELECT true,
    v_recipe_id,
    NULL::TEXT;
EXCEPTION
WHEN OTHERS THEN -- Log del error
RAISE NOTICE 'Error in upsert_recipe_with_ingredients: %',
SQLERRM;
RETURN QUERY
SELECT false,
    NULL::UUID,
    SQLERRM;
END;
$$;
-- Grant permissions
GRANT EXECUTE ON FUNCTION upsert_recipe_with_ingredients TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_recipe_with_ingredients TO anon;