-- Tablas para inventario físico
CREATE TYPE inventory_session_status AS ENUM ('draft', 'completed');

CREATE TABLE IF NOT EXISTS inventory_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status inventory_session_status NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS inventory_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES inventory_sessions(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES master_ingredients(id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL DEFAULT 0,
    unit_price_snapshot NUMERIC NOT NULL DEFAULT 0, -- snapshot del current_avg_price
    category TEXT, -- snapshot de la categoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, ingredient_id)
);

-- Habilitar RLS
ALTER TABLE inventory_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_counts ENABLE ROW LEVEL SECURITY;

-- Políticas para inventory_sessions
CREATE POLICY "Users can view inventory_sessions of their restaurants"
    ON inventory_sessions FOR SELECT
    USING (restaurant_id IN (
        SELECT restaurant_id FROM user_roles WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert inventory_sessions to their restaurants"
    ON inventory_sessions FOR INSERT
    WITH CHECK (restaurant_id IN (
        SELECT restaurant_id FROM user_roles WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update inventory_sessions of their restaurants"
    ON inventory_sessions FOR UPDATE
    USING (restaurant_id IN (
        SELECT restaurant_id FROM user_roles WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete inventory_sessions of their restaurants"
    ON inventory_sessions FOR DELETE
    USING (restaurant_id IN (
        SELECT restaurant_id FROM user_roles WHERE user_id = auth.uid()
    ));

-- Políticas para inventory_counts (basado en la sesión padre)
CREATE POLICY "Users can select inventory_counts of their records"
    ON inventory_counts FOR SELECT
    USING (session_id IN (
        SELECT id FROM inventory_sessions WHERE restaurant_id IN (
            SELECT restaurant_id FROM user_roles WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY "Users can insert inventory_counts of their records"
    ON inventory_counts FOR INSERT
    WITH CHECK (session_id IN (
        SELECT id FROM inventory_sessions WHERE restaurant_id IN (
            SELECT restaurant_id FROM user_roles WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY "Users can update inventory_counts of their records"
    ON inventory_counts FOR UPDATE
    USING (session_id IN (
        SELECT id FROM inventory_sessions WHERE restaurant_id IN (
            SELECT restaurant_id FROM user_roles WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY "Users can delete inventory_counts of their records"
    ON inventory_counts FOR DELETE
    USING (session_id IN (
        SELECT id FROM inventory_sessions WHERE restaurant_id IN (
            SELECT restaurant_id FROM user_roles WHERE user_id = auth.uid()
        )
    ));
