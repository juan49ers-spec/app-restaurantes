-- ==============================================================================
-- FIX: VERIFICATION ERRORS (Missing Column & Permission Denied)
-- ==============================================================================
-- 1. FIX MISSING COLUMN 'category'
ALTER TABLE public.master_ingredients
ADD COLUMN IF NOT EXISTS category text;
-- 2. FIX PERMISSION DENIED (auth.users)
-- Create a secure helper function to access user metadata
-- This function runs as the database owner (SECURITY DEFINER) so it can read auth.users
CREATE OR REPLACE FUNCTION public.get_own_restaurant_id() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN RETURN (
        SELECT (raw_user_meta_data->>'restaurant_id')::uuid
        FROM auth.users
        WHERE id = auth.uid()
    );
END;
$$;
-- 3. UPDATE RLS POLICIES TO USE THE SECURE FUNCTION
-- We need to replace the policies that queried auth.users directly
-- 3.1 MASTER INGREDIENTS
DROP POLICY IF EXISTS "Users can view own master ingredients" ON master_ingredients;
DROP POLICY IF EXISTS "Users can insert own master ingredients" ON master_ingredients;
DROP POLICY IF EXISTS "Users can update own master ingredients" ON master_ingredients;
DROP POLICY IF EXISTS "Users can delete own master ingredients" ON master_ingredients;
CREATE POLICY "Users can view own master ingredients" ON master_ingredients FOR
SELECT USING (restaurant_id = get_own_restaurant_id());
CREATE POLICY "Users can insert own master ingredients" ON master_ingredients FOR
INSERT WITH CHECK (restaurant_id = get_own_restaurant_id());
CREATE POLICY "Users can update own master ingredients" ON master_ingredients FOR
UPDATE USING (restaurant_id = get_own_restaurant_id());
CREATE POLICY "Users can delete own master ingredients" ON master_ingredients FOR DELETE USING (restaurant_id = get_own_restaurant_id());
-- 3.2 RECIPES
DROP POLICY IF EXISTS "Users can view own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can insert own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can update own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can delete own recipes" ON recipes;
CREATE POLICY "Users can view own recipes" ON recipes FOR
SELECT USING (restaurant_id = get_own_restaurant_id());
CREATE POLICY "Users can insert own recipes" ON recipes FOR
INSERT WITH CHECK (restaurant_id = get_own_restaurant_id());
CREATE POLICY "Users can update own recipes" ON recipes FOR
UPDATE USING (restaurant_id = get_own_restaurant_id());
CREATE POLICY "Users can delete own recipes" ON recipes FOR DELETE USING (restaurant_id = get_own_restaurant_id());
-- 3.3 RECIPE INGREDIENTS
-- The previous policy likely had a nested auth.users check too
DROP POLICY IF EXISTS "Users can view own recipe ingredients" ON recipe_ingredients;
DROP POLICY IF EXISTS "Users can insert own recipe ingredients" ON recipe_ingredients;
DROP POLICY IF EXISTS "Users can update own recipe ingredients" ON recipe_ingredients;
DROP POLICY IF EXISTS "Users can delete own recipe ingredients" ON recipe_ingredients;
CREATE POLICY "Users can view own recipe ingredients" ON recipe_ingredients FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM recipes
            WHERE recipes.id = recipe_ingredients.recipe_id
                AND recipes.restaurant_id = get_own_restaurant_id()
        )
    );
CREATE POLICY "Users can insert own recipe ingredients" ON recipe_ingredients FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM recipes
            WHERE recipes.id = recipe_ingredients.recipe_id
                AND recipes.restaurant_id = get_own_restaurant_id()
        )
    );
CREATE POLICY "Users can update own recipe ingredients" ON recipe_ingredients FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM recipes
            WHERE recipes.id = recipe_ingredients.recipe_id
                AND recipes.restaurant_id = get_own_restaurant_id()
        )
    );
CREATE POLICY "Users can delete own recipe ingredients" ON recipe_ingredients FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM recipes
        WHERE recipes.id = recipe_ingredients.recipe_id
            AND recipes.restaurant_id = get_own_restaurant_id()
    )
);
-- 3.4 SUPPLIER ITEMS (Consistency)
DROP POLICY IF EXISTS "Users can view own supplier items" ON supplier_items;
DROP POLICY IF EXISTS "Users can insert own supplier items" ON supplier_items;
DROP POLICY IF EXISTS "Users can update own supplier items" ON supplier_items;
DROP POLICY IF EXISTS "Users can delete own supplier items" ON supplier_items;
CREATE POLICY "Users can view own supplier items" ON supplier_items FOR
SELECT USING (restaurant_id = get_own_restaurant_id());
CREATE POLICY "Users can insert own supplier items" ON supplier_items FOR
INSERT WITH CHECK (restaurant_id = get_own_restaurant_id());
CREATE POLICY "Users can update own supplier items" ON supplier_items FOR
UPDATE USING (restaurant_id = get_own_restaurant_id());
CREATE POLICY "Users can delete own supplier items" ON supplier_items FOR DELETE USING (restaurant_id = get_own_restaurant_id());