-- Add hourly_rate column to recipes table
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC DEFAULT 0;
-- Comment on column
COMMENT ON COLUMN recipes.hourly_rate IS 'Coste por hora de mano de obra para esta receta específica';