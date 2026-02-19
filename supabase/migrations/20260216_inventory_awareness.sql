-- Migration: Inventory Awareness & Atomic Sales (FIXED IDEMPOTENCY)
-- Date: 2026-02-16
-- 1. Create Alert Type
DROP TYPE IF EXISTS stock_alert_result CASCADE;
CREATE TYPE stock_alert_result AS (
    ingredient_id UUID,
    ingredient_name TEXT,
    current_qty NUMERIC,
    min_qty NUMERIC
);
-- 2. The Atomic Function with ROLLBACK/CLEANUP Logic
CREATE OR REPLACE FUNCTION process_daily_sales_atomic(
        p_restaurant_id UUID,
        p_date DATE,
        p_sales JSONB,
        -- Array of { recipe_id, quantity_sold }
        p_deductions JSONB -- Array of { ingredient_id, quantity_deducted }
    ) RETURNS SETOF stock_alert_result LANGUAGE plpgsql AS $$
DECLARE rec_sale JSONB;
rec_deduction JSONB;
rec_undo RECORD;
v_current_qty NUMERIC;
v_min_qty NUMERIC;
v_ing_name TEXT;
BEGIN -- A. FASE DE LIMPIEZA (ROLLBACK PREVIO)
-- Si ya procesamos ventas para esta fecha, el stock está descontado.
-- Debemos "devolver" ese stock antes de aplicar el nuevo cálculo para evitar doble descuento.
-- 1. Iterar sobre movimientos existentes de TIPO 'SALE' para esta fecha y restaurante
FOR rec_undo IN
SELECT ingredient_id,
    quantity
FROM stock_movements
WHERE restaurant_id = p_restaurant_id
    AND date = p_date
    AND type = 'SALE'
    AND notes = 'Ventas diarias atomic' -- Identificador de seguridad
    LOOP -- La cantidad en stock_movements es negativa (ej: -5).
    -- Para restaurar, restamos la cantidad negativa (Stock - (-5) = Stock + 5)
UPDATE inventory_stock
SET current_qty = current_qty - rec_undo.quantity,
    last_updated = NOW()
WHERE restaurant_id = p_restaurant_id
    AND ingredient_id = rec_undo.ingredient_id;
END LOOP;
-- 2. Borrar los movimientos de stock viejos (para reescribirlos limpios)
DELETE FROM stock_movements
WHERE restaurant_id = p_restaurant_id
    AND date = p_date
    AND type = 'SALE'
    AND notes = 'Ventas diarias atomic';
-- B. FASE DE REGISTRO DE VENTAS (UPSERT)
FOR rec_sale IN
SELECT *
FROM jsonb_array_elements(p_sales) LOOP
INSERT INTO daily_recipe_sales (restaurant_id, date, recipe_id, quantity_sold)
VALUES (
        p_restaurant_id,
        p_date,
        (rec_sale->>'recipe_id')::UUID,
        (rec_sale->>'quantity_sold')::NUMERIC
    ) ON CONFLICT (restaurant_id, date, recipe_id) DO
UPDATE
SET quantity_sold = EXCLUDED.quantity_sold;
END LOOP;
-- C. FASE DE NUEVO DESCUENTO DE STOCK
FOR rec_deduction IN
SELECT *
FROM jsonb_array_elements(p_deductions) LOOP -- 1. Insertar el Movimiento (Log)
INSERT INTO stock_movements (
        restaurant_id,
        ingredient_id,
        type,
        quantity,
        reference_id,
        notes,
        date
    )
VALUES (
        p_restaurant_id,
        (rec_deduction->>'ingredient_id')::UUID,
        'SALE',
        -(rec_deduction->>'quantity_deducted')::NUMERIC,
        -- Siempre negativo
        p_date::TEXT,
        -- Usamos la fecha como referencia simple
        'Ventas diarias atomic',
        -- MARCADOR CRÍTICO PARA EL ROLLBACK
        p_date
    );
-- 2. Actualizar Inventario (Restar)
UPDATE inventory_stock
SET current_qty = GREATEST(
        0,
        current_qty - (rec_deduction->>'quantity_deducted')::NUMERIC
    ),
    last_updated = NOW()
WHERE restaurant_id = p_restaurant_id
    AND ingredient_id = (rec_deduction->>'ingredient_id')::UUID
RETURNING current_qty,
    min_qty INTO v_current_qty,
    v_min_qty;
-- 3. Verificar Alerta
SELECT name INTO v_ing_name
FROM master_ingredients
WHERE id = (rec_deduction->>'ingredient_id')::UUID;
IF v_current_qty <= v_min_qty THEN RETURN NEXT ROW(
    (rec_deduction->>'ingredient_id')::UUID,
    v_ing_name,
    v_current_qty,
    v_min_qty
);
END IF;
END LOOP;
RETURN;
END;
$$;