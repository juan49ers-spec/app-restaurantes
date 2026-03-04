-- Migrate from current_plan to active_addons
ALTER TABLE public.restaurants DROP COLUMN IF EXISTS current_plan;
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS active_addons JSONB DEFAULT '[]'::jsonb;