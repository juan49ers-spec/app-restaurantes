-- Migration: support_sub_recipes
-- Description: Allow recipe_ingredients to point to EITHER a master_ingredient (leaf) OR another recipe (node).
-- 1. Add sub_recipe_id column
ALTER TABLE recipe_ingredients
ADD COLUMN sub_recipe_id UUID REFERENCES recipes(id);
-- 2. Make master_ingredient_id nullable (as it might be a sub_recipe instead)
ALTER TABLE recipe_ingredients
ALTER COLUMN master_ingredient_id DROP NOT NULL;
-- 3. Add constraint to ensure mutual exclusivity (optional but good practice)
ALTER TABLE recipe_ingredients
ADD CONSTRAINT check_ingredient_source CHECK (
        (
            master_ingredient_id IS NOT NULL
            AND sub_recipe_id IS NULL
        )
        OR (
            master_ingredient_id IS NULL
            AND sub_recipe_id IS NOT NULL
        )
    );
-- 4. Create explicit index for sub_recipe_id
CREATE INDEX idx_recipe_ingredients_sub_recipe_id ON recipe_ingredients(sub_recipe_id);