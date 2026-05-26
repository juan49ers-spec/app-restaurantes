-- Fix upsert_recipe_with_ingredients to match current schema columns
-- Original migration (20260304) used old column names (cost, price, category, etc.)
-- This migration drops and recreates with correct columns.

DROP FUNCTION IF EXISTS upsert_recipe_with_ingredients CASCADE;

CREATE OR REPLACE FUNCTION upsert_recipe_with_ingredients(
    p_recipe_id UUID,
    p_restaurant_id UUID,
    p_name TEXT,
    p_prep_time_minutes INTEGER,
    p_current_cost NUMERIC,
    p_selling_price NUMERIC,
    p_target_margin_pct NUMERIC,
    p_hourly_rate NUMERIC,
    p_yields NUMERIC,
    p_ingredients JSONB
) RETURNS TABLE(
    success BOOLEAN,
    recipe_id UUID,
    error_message TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_item JSONB;
    v_recipe_id UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM restaurants WHERE id = p_restaurant_id
    ) THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Restaurant not found';
        RETURN;
    END IF;

    v_recipe_id := COALESCE(p_recipe_id, gen_random_uuid());

    INSERT INTO recipes (
        id, restaurant_id, name, prep_time_minutes,
        current_cost, selling_price, target_margin_pct,
        hourly_rate, yields
    ) VALUES (
        v_recipe_id, p_restaurant_id, p_name,
        COALESCE(p_prep_time_minutes, 0),
        COALESCE(p_current_cost, 0),
        COALESCE(p_selling_price, 0),
        COALESCE(p_target_margin_pct, 0),
        COALESCE(p_hourly_rate, 0),
        COALESCE(p_yields, 1)
    ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        prep_time_minutes = EXCLUDED.prep_time_minutes,
        current_cost = EXCLUDED.current_cost,
        selling_price = EXCLUDED.selling_price,
        target_margin_pct = EXCLUDED.target_margin_pct,
        hourly_rate = EXCLUDED.hourly_rate,
        yields = EXCLUDED.yields,
        updated_at = NOW();

    DELETE FROM recipe_ingredients WHERE recipe_ingredients.recipe_id = v_recipe_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_ingredients)
    LOOP
        INSERT INTO recipe_ingredients (
            id, recipe_id, master_ingredient_id,
            quantity_gross, quantity_net, yield_factor, cost_at_time
        ) VALUES (
            gen_random_uuid(),
            v_recipe_id,
            (v_item->>'master_ingredient_id')::UUID,
            (v_item->>'quantity_gross')::NUMERIC,
            COALESCE((v_item->>'quantity_net')::NUMERIC, (v_item->>'quantity_gross')::NUMERIC),
            COALESCE((v_item->>'yield_factor')::NUMERIC, 1.0),
            COALESCE((v_item->>'cost_at_time')::NUMERIC, 0)
        );
    END LOOP;

    RETURN QUERY SELECT true, v_recipe_id, NULL::TEXT;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in upsert_recipe_with_ingredients: %', SQLERRM;
    RETURN QUERY SELECT false, NULL::UUID, SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_recipe_with_ingredients TO authenticated;
