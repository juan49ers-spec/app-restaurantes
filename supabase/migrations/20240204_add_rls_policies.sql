-- RLS Policies Migration for Control Hub
-- Enable Row Level Security on all tables

ALTER TABLE master_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own restaurant's data
-- NOTE: Assumes auth.uid() maps to restaurant_id via user_metadata

-- 1. Master Ingredients
CREATE POLICY "Users can view own master ingredients"
    ON master_ingredients FOR SELECT
    USING (restaurant_id::text = (SELECT raw_user_meta_data->>'restaurant_id' FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own master ingredients"
    ON master_ingredients FOR INSERT
    WITH CHECK (restaurant_id::text = (SELECT raw_user_meta_data->>'restaurant_id' FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can update own master ingredients"
    ON master_ingredients FOR UPDATE
    USING (restaurant_id::text = (SELECT raw_user_meta_data->>'restaurant_id' FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete own master ingredients"
    ON master_ingredients FOR DELETE
    USING (restaurant_id::text = (SELECT raw_user_meta_data->>'restaurant_id' FROM auth.users WHERE id = auth.uid()));

-- 2. Supplier Items
CREATE POLICY "Users can view own supplier items"
    ON supplier_items FOR SELECT
    USING (restaurant_id::text = (SELECT raw_user_meta_data->>'restaurant_id' FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own supplier items"
    ON supplier_items FOR INSERT
    WITH CHECK (restaurant_id::text = (SELECT raw_user_meta_data->>'restaurant_id' FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can update own supplier items"
    ON supplier_items FOR UPDATE
    USING (restaurant_id::text = (SELECT raw_user_meta_data->>'restaurant_id' FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete own supplier items"
    ON supplier_items FOR DELETE
    USING (restaurant_id::text = (SELECT raw_user_meta_data->>'restaurant_id' FROM auth.users WHERE id = auth.uid()));

-- 3. Recipes
CREATE POLICY "Users can view own recipes"
    ON recipes FOR SELECT
    USING (restaurant_id::text = (SELECT raw_user_meta_data->>'restaurant_id' FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own recipes"
    ON recipes FOR INSERT
    WITH CHECK (restaurant_id::text = (SELECT raw_user_meta_data->>'restaurant_id' FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can update own recipes"
    ON recipes FOR UPDATE
    USING (restaurant_id::text = (SELECT raw_user_meta_data->>'restaurant_id' FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete own recipes"
    ON recipes FOR DELETE
    USING (restaurant_id::text = (SELECT raw_user_meta_data->>'restaurant_id' FROM auth.users WHERE id = auth.uid()));

-- 4. Recipe Ingredients
CREATE POLICY "Users can view own recipe ingredients"
    ON recipe_ingredients FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM recipes
        WHERE recipes.id = recipe_ingredients.recipe_id
        AND recipes.restaurant_id::text = (SELECT raw_user_meta_data->>'restaurant_id' FROM auth.users WHERE id = auth.uid())
    ));

CREATE POLICY "Users can insert own recipe ingredients"
    ON recipe_ingredients FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM recipes
        WHERE recipes.id = recipe_ingredients.recipe_id
        AND recipes.restaurant_id::text = (SELECT raw_user_meta_data->>'restaurant_id' FROM auth.users WHERE id = auth.uid())
    ));

CREATE POLICY "Users can update own recipe ingredients"
    ON recipe_ingredients FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM recipes
        WHERE recipes.id = recipe_ingredients.recipe_id
        AND recipes.restaurant_id::text = (SELECT raw_user_meta_data->>'restaurant_id' FROM auth.users WHERE id = auth.uid())
    ));

CREATE POLICY "Users can delete own recipe ingredients"
    ON recipe_ingredients FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM recipes
        WHERE recipes.id = recipe_ingredients.recipe_id
        AND recipes.restaurant_id::text = (SELECT raw_user_meta_data->>'restaurant_id' FROM auth.users WHERE id = auth.uid())
    ));
