-- PASO 2: Crear FUNCIONES y TRIGGERS
-- Ejecutar DESPUÉS del PASO 1 (debe decir "CREADA" en las 4 tablas)

-- Función para calcular costo de receta
CREATE OR REPLACE FUNCTION calculate_recipe_cost(recipe_uuid UUID) 
RETURNS NUMERIC AS $$
DECLARE total NUMERIC := 0;
BEGIN
    SELECT COALESCE(SUM(mi.current_avg_price * ri.quantity_gross), 0)
    INTO total
    FROM recipe_ingredients ri
    JOIN master_ingredients mi ON ri.master_ingredient_id = mi.id
    WHERE ri.recipe_id = recipe_uuid;
    RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Función trigger para actualizar costos
CREATE OR REPLACE FUNCTION update_recipe_costs_trigger() 
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        IF (NEW.current_avg_price <> OLD.current_avg_price) THEN
            UPDATE recipes
            SET current_cost = calculate_recipe_cost(id),
                updated_at = NOW()
            WHERE id IN (
                SELECT recipe_id
                FROM recipe_ingredients
                WHERE master_ingredient_id = NEW.id
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_update_costs_on_ingredient_change ON master_ingredients;

CREATE TRIGGER trigger_update_costs_on_ingredient_change
AFTER UPDATE ON master_ingredients
FOR EACH ROW
EXECUTE FUNCTION update_recipe_costs_trigger();

-- Verificar que todo se creó
SELECT 
    'Funciones y triggers creados' AS status;
