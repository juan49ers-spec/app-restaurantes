-- Add Soft Delete support to master_ingredients
ALTER TABLE master_ingredients
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;
COMMENT ON COLUMN master_ingredients.is_active IS 'Soft delete flag. False means archived.';
COMMENT ON COLUMN master_ingredients.archived_at IS 'When the ingredient was archived.';
-- Index for faster filtering of active ingredients
CREATE INDEX IF NOT EXISTS idx_master_ingredients_is_active ON master_ingredients(is_active)
WHERE is_active = TRUE;