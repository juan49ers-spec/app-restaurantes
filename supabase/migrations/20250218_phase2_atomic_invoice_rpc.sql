-- ==========================================
-- FASE 2.1: Transacciones Atómicas para Facturas
-- ==========================================

-- 1. Crear tabla invoice_items (si no existe)
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC(10, 2) DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    tax_rate NUMERIC(5, 2) DEFAULT 0,
    tax_amount NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_quantity CHECK (quantity >= 0),
    CONSTRAINT positive_unit_price CHECK (unit_price >= 0)
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id 
ON invoice_items(invoice_id);

-- 2. Añadir idempotency_key a invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_invoices_idempotency 
ON invoices(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 3. Añadir idempotency_key a operating_expenses
ALTER TABLE operating_expenses 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_operating_expenses_idempotency 
ON operating_expenses(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 4. Función RPC para upsert de facturas con ítems (ATÓMICA)
CREATE OR REPLACE FUNCTION upsert_invoice_with_items(
    p_invoice_id UUID DEFAULT gen_random_uuid(),
    p_restaurant_id UUID,
    p_supplier_id UUID,
    p_idempotency_key TEXT DEFAULT NULL,
    p_invoice_number TEXT,
    p_invoice_date DATE,
    p_total_amount NUMERIC,
    p_file_url TEXT DEFAULT NULL,
    p_scanned_data JSONB DEFAULT '{}'::jsonb,
    p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS TABLE(
    success BOOLEAN,
    invoice_id UUID,
    error_message TEXT,
    items_created INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item JSONB;
    v_line_item_id UUID;
    v_items_count INTEGER := 0;
BEGIN
    -- 1. Validar que el restaurante pertenece al usuario
    IF NOT EXISTS (
        SELECT 1 FROM restaurants 
        WHERE id = p_restaurant_id 
        AND owner_id = auth.uid()
    ) THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Restaurant not found', 0;
        RETURN;
    END IF;

    -- 2. Validar idempotencia si se proporciona
    IF p_idempotency_key IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM invoices 
            WHERE idempotency_key = p_idempotency_key 
            AND id != p_invoice_id
        ) THEN
            RETURN QUERY SELECT false, NULL::UUID, 'Duplicate invoice (idempotency)', 0;
            RETURN;
        END IF;
    END IF;

    -- 3. Upsert de la factura
    INSERT INTO invoices (
        id, 
        restaurant_id, 
        supplier_id, 
        idempotency_key,
        invoice_number, 
        date, 
        total_amount,
        file_url,
        scanned_data,
        status,
        created_at
    )
    VALUES (
        p_invoice_id, 
        p_restaurant_id, 
        p_supplier_id, 
        p_idempotency_key,
        p_invoice_number, 
        p_invoice_date, 
        p_total_amount,
        p_file_url,
        p_scanned_data,
        'review_required',
        NOW()
    )
    ON CONFLICT (id)
    DO UPDATE SET
        supplier_id = EXCLUDED.supplier_id,
        invoice_number = EXCLUDED.invoice_number,
        date = EXCLUDED.date,
        total_amount = EXCLUDED.total_amount,
        scanned_data = EXCLUDED.scanned_data,
        updated_at = NOW();

    -- 4. Eliminar ítems anteriores (para upsert)
    DELETE FROM invoice_items 
    WHERE invoice_id = p_invoice_id;

    -- 5. Insertar nuevos ítems
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO invoice_items (
            invoice_id,
            description,
            quantity,
            unit_price,
            total_price,
            tax_rate,
            tax_amount
        )
        VALUES (
            p_invoice_id,
            v_item->>'description',
            (v_item->>'quantity')::NUMERIC,
            (v_item->>'unit_price')::NUMERIC,
            (v_item->>'total_price')::NUMERIC,
            COALESCE((v_item->>'tax_rate')::NUMERIC, 0),
            COALESCE((v_item->>'tax_amount')::NUMERIC, 0)
        );

        v_items_count := v_items_count + 1;
    END LOOP;

    -- 6. Retornar éxito
    RETURN QUERY SELECT true, p_invoice_id, NULL::TEXT, v_items_count;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log del error
        RAISE NOTICE 'Error in upsert_invoice_with_items: %', SQLERRM;
        RETURN QUERY SELECT false, NULL::UUID, SQLERRM, 0;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION upsert_invoice_with_items TO authenticated;

-- Comentario para documentación
COMMENT ON FUNCTION upsert_invoice_with_items IS 
'Upserts invoice and items in a single atomic transaction.
Prevents duplicate invoices via idempotency_key.
Returns success status, invoice_id, error message, and number of items created.';

-- 5. Trigger para actualización de timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON invoices 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
