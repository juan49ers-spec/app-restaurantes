-- ==============================================================================
-- FIX: RECIPE PERMISSIONS (Targeted Fix)
-- ==============================================================================
-- 1. Ensure the secure function exists (just in case)
CREATE OR REPLACE FUNCTION public.get_own_restaurant_id() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN RETURN (
        SELECT (raw_user_meta_data->>'restaurant_id')::uuid
        FROM auth.users
        WHERE id = auth.uid()
    );
END;
$$;
-- 2. RESET POLICIES FOR 'recipes'
-- We drop ALL policies to ensure no old ones remain causing conflicts
DROP POLICY IF EXISTS "Users can view own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can insert own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can update own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can delete own recipes" ON recipes;
-- Also drop potential variations if created manually
DROP POLICY IF EXISTS "view_own_recipes" ON recipes;
DROP POLICY IF EXISTS "insert_own_recipes" ON recipes;
CREATE POLICY "Users can view own recipes" ON recipes FOR
SELECT USING (restaurant_id = get_own_restaurant_id());
CREATE POLICY "Users can insert own recipes" ON recipes FOR
INSERT WITH CHECK (restaurant_id = get_own_restaurant_id());
CREATE POLICY "Users can update own recipes" ON recipes FOR
UPDATE USING (restaurant_id = get_own_restaurant_id());
CREATE POLICY "Users can delete own recipes" ON recipes FOR DELETE USING (restaurant_id = get_own_restaurant_id());
-- 3. RESET POLICIES FOR 'recipe_ingredients'
DROP POLICY IF EXISTS "Users can view own recipe ingredients" ON recipe_ingredients;
DROP POLICY IF EXISTS "Users can insert own recipe ingredients" ON recipe_ingredients;
DROP POLICY IF EXISTS "Users can update own recipe ingredients" ON recipe_ingredients;
DROP POLICY IF EXISTS "Users can delete own recipe ingredients" ON recipe_ingredients;
-- The policy checks if the associated recipe belongs to the user
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
-- 4. VERIFY POLICIES
SELECT tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('recipes', 'recipe_ingredients')
ORDER BY tablename,
    cmd;