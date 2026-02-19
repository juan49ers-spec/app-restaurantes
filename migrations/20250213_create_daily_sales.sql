-- =====================================================
-- DAILY SALES TABLE
-- =====================================================
-- Tabla para registrar ventas diarias con desglose de IVA
-- Necesaria para el formulario de cierre de caja

CREATE TABLE IF NOT EXISTS daily_sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
    date DATE NOT NULL,
    
    -- Total revenue
    revenue_total NUMERIC DEFAULT 0 NOT NULL,
    
    -- Desglose de IVA (España: 10% y 21%)
    base_10 NUMERIC DEFAULT 0 NOT NULL,      -- Base imponible 10%
    tax_10 NUMERIC DEFAULT 0 NOT NULL,        -- Cuota IVA 10%
    base_21 NUMERIC DEFAULT 0 NOT NULL,      -- Base imponible 21%
    tax_21 NUMERIC DEFAULT 0 NOT NULL,        -- Cuota IVA 21%
    
    -- IVA total (backward compatibility)
    iva_collected NUMERIC DEFAULT 0 NOT NULL,
    
    -- Desglose por tipo de servicio
    revenue_dine_in NUMERIC DEFAULT 0 NOT NULL,    -- Salón
    revenue_takeout NUMERIC DEFAULT 0 NOT NULL,   -- Para llevar
    revenue_delivery NUMERIC DEFAULT 0 NOT NULL,    -- Delivery
    
    -- Métricas operacionales
    total_covers INTEGER DEFAULT 0 NOT NULL,       -- Número de comensales
    labor_hours NUMERIC DEFAULT 0 NOT NULL,        -- Horas de personal
    cost_of_goods NUMERIC DEFAULT 0 NOT NULL,     -- Coste de bienes
    labor_cost NUMERIC DEFAULT 0 NOT NULL,         -- Coste de personal
    
    -- Estado del día
    day_status TEXT DEFAULT 'OPEN' NOT NULL,
    source TEXT,
    
    -- Constraint: Solo un registro por restaurante y día
    UNIQUE(restaurant_id, date)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_daily_sales_restaurant_date ON daily_sales(restaurant_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON daily_sales(date);

-- RLS (Row Level Security)
ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver/editar sus propios restaurantes
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

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_daily_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_daily_sales_updated_at ON daily_sales;
CREATE TRIGGER update_daily_sales_updated_at
    BEFORE UPDATE ON daily_sales
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_sales_updated_at();

-- Trigger para calcular iva_collected automáticamente
CREATE OR REPLACE FUNCTION calculate_daily_sales_iva()
RETURNS TRIGGER AS $$
BEGIN
    NEW.iva_collected = COALESCE(NEW.tax_10, 0) + COALESCE(NEW.tax_21, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_daily_sales_iva ON daily_sales;
CREATE TRIGGER calculate_daily_sales_iva
    BEFORE INSERT OR UPDATE OF tax_10, tax_21 ON daily_sales
    FOR EACH ROW
    EXECUTE FUNCTION calculate_daily_sales_iva();
