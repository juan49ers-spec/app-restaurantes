-- Add hourly_rate column to recipes table (Applied via MCP on 2026-02-16)
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC DEFAULT 0;
COMMENT ON COLUMN recipes.hourly_rate IS 'Coste por hora de mano de obra para esta receta específica';
-- Add prep_time_minutes column to recipes table
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS prep_time_minutes NUMERIC DEFAULT 0;
COMMENT ON COLUMN recipes.prep_time_minutes IS 'Tiempo de preparación en minutos para cálculo de mano de obra';
-- Add yields column to recipes table (Applied via MCP on 2026-02-16)
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS yields NUMERIC DEFAULT 1;
COMMENT ON COLUMN recipes.yields IS 'Número de raciones o unidades base que produce esta receta';