-- Create price_history table
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL,
    -- Logical reference to ingredient or recipe
    entity_type TEXT NOT NULL CHECK (entity_type IN ('INGREDIENT', 'RECIPE')),
    price DECIMAL(10, 4) NOT NULL,
    previous_price DECIMAL(10, 4),
    change_pct DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Enable RLS
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
-- Create Policy: Users can view history for their restaurant
CREATE POLICY "Users can view price_history for their restaurant" ON price_history FOR
SELECT USING (
        restaurant_id = (
            SELECT restaurant_id
            FROM users
            WHERE id = auth.uid()
        )
    );
-- Create Policy: Users can insert history for their restaurant
CREATE POLICY "Users can insert price_history for their restaurant" ON price_history FOR
INSERT WITH CHECK (
        restaurant_id = (
            SELECT restaurant_id
            FROM users
            WHERE id = auth.uid()
        )
    );
-- Create Index for performance
CREATE INDEX idx_price_history_entity ON price_history(entity_id, created_at DESC);