-- =====================================================
-- ACTUALIZAR DAILY_SALES - MIGRACIÓN SEGURA
-- =====================================================
-- Esta migración:
-- 1. Crea la tabla si no existe
-- 2. Agrega columnas faltantes si ya existe
-- 3. NO elimina datos existentes

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS daily_sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
    date DATE NOT NULL,
    revenue_total NUMERIC DEFAULT 0 NOT NULL,
    iva_collected NUMERIC DEFAULT 0 NOT NULL,
    revenue_dine_in NUMERIC DEFAULT 0 NOT NULL,
    revenue_takeout NUMERIC DEFAULT 0 NOT NULL,
    revenue_delivery NUMERIC DEFAULT 0 NOT NULL,
    total_covers INTEGER DEFAULT 0 NOT NULL,
    labor_hours NUMERIC DEFAULT 0 NOT NULL,
    day_status TEXT DEFAULT 'OPEN' NOT NULL,
    source TEXT,
    UNIQUE(restaurant_id, date)
);

-- Columnas que pueden faltar (agregar solo si no existen)
DO $$
BEGIN
    -- base_10
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'daily_sales' 
        AND column_name = 'base_10'
    ) THEN
        ALTER TABLE daily_sales ADD COLUMN base_10 NUMERIC DEFAULT 0 NOT NULL;
    END IF;
    
    -- tax_10
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'daily_sales' 
        AND column_name = 'tax_10'
    ) THEN
        ALTER TABLE daily_sales ADD COLUMN tax_10 NUMERIC DEFAULT 0 NOT NULL;
    END IF;
    
    -- base_21
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'daily_sales' 
        AND column_name = 'base_21'
    ) THEN
        ALTER TABLE daily_sales ADD COLUMN base_21 NUMERIC DEFAULT 0 NOT NULL;
    END IF;
    
    -- tax_21
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'daily_sales' 
        AND column_name = 'tax_21'
    ) THEN
        ALTER TABLE daily_sales ADD COLUMN tax_21 NUMERIC DEFAULT 0 NOT NULL;
    END IF;
    
    -- cost_of_goods
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'daily_sales' 
        AND column_name = 'cost_of_goods'
    ) THEN
        ALTER TABLE daily_sales ADD COLUMN cost_of_goods NUMERIC DEFAULT 0 NOT NULL;
    END IF;
    
    -- labor_cost
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'daily_sales' 
        AND column_name = 'labor_cost'
    ) THEN
        ALTER TABLE daily_sales ADD COLUMN labor_cost NUMERIC DEFAULT 0 NOT NULL;
    END IF;
    
    -- updated_at
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'daily_sales' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE daily_sales ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;
END $$;

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_daily_sales_restaurant_date ON daily_sales(restaurant_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON daily_sales(date);

-- RLS
ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD their own daily sales" ON daily_sales;
CREATE POLICY "Users can CRUD their own daily sales" ON daily_sales
    FOR ALL
    USING (
        restaurant_id IN (
            SELECT id
            FROM restaurants
            WHERE owner_id = auth.uid()
        )
    );
