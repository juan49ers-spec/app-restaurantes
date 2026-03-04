-- Función segura para que los super administradores puedan eliminar restaurantes
CREATE OR REPLACE FUNCTION admin_delete_restaurant(target_restaurant_id UUID) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN -- Verificar si el usuario actual es super admin
    IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Acceso denegado. Se requieren privilegios de super administrador.';
END IF;
-- Eliminar el restaurante. 
-- Las claves foráneas (ON DELETE CASCADE) se encargarán de eliminar 
-- los registros asociados en daily_sales, employees, ingredients, etc.
DELETE FROM restaurants
WHERE id = target_restaurant_id;
END;
$$;