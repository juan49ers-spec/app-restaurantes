-- Migration: Stock Control & Waste Management
-- Creates tables for inventory tracking, stock movements, daily recipe sales, and waste logs
-- 1. Inventory Stock (current stock per ingredient)
CREATE TABLE IF NOT EXISTS inventory_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES master_ingredients(id) ON DELETE CASCADE,
    current_qty NUMERIC(12, 4) NOT NULL DEFAULT 0,
    min_qty NUMERIC(12, 4) NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT now(),
    UNIQUE(restaurant_id, ingredient_id)
);
-- 2. Stock Movements (audit trail of all changes)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES master_ingredients(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (
        type IN ('PURCHASE', 'SALE', 'WASTE', 'ADJUSTMENT')
    ),
    quantity NUMERIC(12, 4) NOT NULL,
    reference_id TEXT,
    notes TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- 3. Daily Recipe Sales (daily sales count per recipe)
CREATE TABLE IF NOT EXISTS daily_recipe_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    quantity_sold INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(restaurant_id, date, recipe_id)
);
-- 4. Waste Logs (daily waste entries)
CREATE TABLE IF NOT EXISTS waste_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES master_ingredients(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    quantity NUMERIC(12, 4) NOT NULL CHECK (quantity > 0),
    reason TEXT NOT NULL DEFAULT 'OTRO' CHECK (
        reason IN (
            'CADUCADO',
            'DAÑADO',
            'SOBRANTE',
            'PREPARACION',
            'OTRO'
        )
    ),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_stock_restaurant ON inventory_stock(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_restaurant_date ON stock_movements(restaurant_id, date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ingredient ON stock_movements(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_daily_recipe_sales_restaurant_date ON daily_recipe_sales(restaurant_id, date);
CREATE INDEX IF NOT EXISTS idx_waste_logs_restaurant_date ON waste_logs(restaurant_id, date);
-- RLS Policies
ALTER TABLE inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_recipe_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_logs ENABLE ROW LEVEL SECURITY;
-- inventory_stock RLS
CREATE POLICY "Users can view their restaurant inventory" ON inventory_stock FOR
SELECT USING (
        restaurant_id IN (
            SELECT id
            FROM restaurants
            WHERE owner_id = auth.uid()
        )
    );
CREATE POLICY "Users can manage their restaurant inventory" ON inventory_stock FOR ALL USING (
    restaurant_id IN (
        SELECT id
        FROM restaurants
        WHERE owner_id = auth.uid()
    )
);
-- stock_movements RLS
CREATE POLICY "Users can view their restaurant stock movements" ON stock_movements FOR
SELECT USING (
        restaurant_id IN (
            SELECT id
            FROM restaurants
            WHERE owner_id = auth.uid()
        )
    );
CREATE POLICY "Users can manage their restaurant stock movements" ON stock_movements FOR ALL USING (
    restaurant_id IN (
        SELECT id
        FROM restaurants
        WHERE owner_id = auth.uid()
    )
);
-- daily_recipe_sales RLS
CREATE POLICY "Users can view their restaurant recipe sales" ON daily_recipe_sales FOR
SELECT USING (
        restaurant_id IN (
            SELECT id
            FROM restaurants
            WHERE owner_id = auth.uid()
        )
    );
CREATE POLICY "Users can manage their restaurant recipe sales" ON daily_recipe_sales FOR ALL USING (
    restaurant_id IN (
        SELECT id
        FROM restaurants
        WHERE owner_id = auth.uid()
    )
);
-- waste_logs RLS
CREATE POLICY "Users can view their restaurant waste logs" ON waste_logs FOR
SELECT USING (
        restaurant_id IN (
            SELECT id
            FROM restaurants
            WHERE owner_id = auth.uid()
        )
    );
CREATE POLICY "Users can manage their restaurant waste logs" ON waste_logs FOR ALL USING (
    restaurant_id IN (
        SELECT id
        FROM restaurants
        WHERE owner_id = auth.uid()
    )
);