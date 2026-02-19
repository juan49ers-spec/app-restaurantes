-- 1. Actualizar tabla daily_sales con desglose de canales y estado
ALTER TABLE daily_sales
ADD COLUMN IF NOT EXISTS revenue_dine_in numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS revenue_takeout numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS revenue_delivery numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_covers integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS labor_hours numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS day_status text CHECK (day_status IN ('OPEN', 'CLOSED', 'LOCKED')) DEFAULT 'OPEN';
-- 2. Crear tabla operating_expenses
CREATE TABLE IF NOT EXISTS operating_expenses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
    date date NOT NULL,
    category text NOT NULL CHECK (
        category IN (
            'COGS_FOOD',
            'COGS_BEVERAGE',
            'LABOR_PAYROLL',
            'LABOR_TAXES',
            'OCCUPANCY_RENT',
            'OCCUPANCY_UTILITIES',
            'MARKETING',
            'MAINTENANCE',
            'PROFESSIONAL_SERVICES',
            'INSURANCE',
            'FINANCIAL',
            'TECH',
            'UNCATEGORIZED_CASH',
            'OTHER'
        )
    ),
    amount numeric NOT NULL,
    description text,
    payment_method text CHECK (
        payment_method IN ('bank', 'cash', 'card', 'transfer', 'other')
    ),
    recurrence text CHECK (
        recurrence IN ('NONE', 'WEEKLY', 'MONTHLY', 'YEARLY')
    ) DEFAULT 'NONE',
    is_paid boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- 3. Habilitar RLS para operating_expenses
ALTER TABLE operating_expenses ENABLE ROW LEVEL SECURITY;
-- 4. Crear política RLS para operating_expenses (Permitir todo al usuario autenticado del restaurante)
CREATE POLICY "Users can manage their restaurant expenses" ON operating_expenses FOR ALL USING (
    restaurant_id IN (
        SELECT id
        FROM restaurants
        WHERE owner_id = auth.uid()
    )
);
-- 5. Crear índices para mejorar performance de reportes
CREATE INDEX IF NOT EXISTS idx_operating_expenses_restaurant_date ON operating_expenses(restaurant_id, date);
CREATE INDEX IF NOT EXISTS idx_operating_expenses_category ON operating_expenses(category);