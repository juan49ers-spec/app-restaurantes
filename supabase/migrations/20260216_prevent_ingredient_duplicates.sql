-- Cleanup Script: Deduplicate ALL master_ingredients based on (restaurant_id, lower(name))
-- Logic: Keep the one that is used in recipes (if any), otherwise keep the most recently updated one.
WITH usage_counts AS (
    SELECT mi.id,
        COUNT(ri.id) as usage_count
    FROM master_ingredients mi
        LEFT JOIN recipe_ingredients ri ON mi.id = ri.master_ingredient_id
    GROUP BY mi.id
),
ranked_ingredients AS (
    SELECT mi.id,
        mi.restaurant_id,
        lower(mi.name) as lower_name,
        uc.usage_count,
        mi.last_updated_at,
        ROW_NUMBER() OVER (
            PARTITION BY mi.restaurant_id,
            lower(mi.name)
            ORDER BY uc.usage_count DESC,
                mi.last_updated_at DESC,
                mi.id ASC
        ) as rank
    FROM master_ingredients mi
        JOIN usage_counts uc ON mi.id = uc.id
)
DELETE FROM master_ingredients
WHERE id IN (
        SELECT id
        FROM ranked_ingredients
        WHERE rank > 1
    );
-- After cleanup, apply UNIQUE constraint to prevent future duplicates
ALTER TABLE master_ingredients
ADD CONSTRAINT unique_ingredient_name_per_restaurant UNIQUE (restaurant_id, name);