-- Función segura para obtener métricas de salud del sistema desde auth.users
-- Sólo accesible por super administradores
CREATE OR REPLACE FUNCTION admin_get_system_health() RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result json;
BEGIN -- Verificar si el usuario actual es super admin
IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Acceso denegado. Se requieren privilegios de super administrador.';
END IF;
WITH user_stats AS (
    SELECT id,
        created_at,
        last_sign_in_at,
        -- Días desde el último inicio de sesión (si es nulo, usamos la fecha de creación como fallback)
        EXTRACT(
            DAY
            FROM NOW() - COALESCE(last_sign_in_at, created_at)
        ) AS days_inactive
    FROM auth.users
)
SELECT json_build_object(
        'total_users',
        (
            SELECT COUNT(*)
            FROM user_stats
        ),
        'new_this_week',
        (
            SELECT COUNT(*)
            FROM user_stats
            WHERE created_at > NOW() - INTERVAL '7 days'
        ),
        'active_last_7_days',
        (
            SELECT COUNT(*)
            FROM user_stats
            WHERE days_inactive <= 7
        ),
        'inactive_over_15_days',
        (
            SELECT COUNT(*)
            FROM user_stats
            WHERE days_inactive > 15
        ),
        'users_data',
        (
            SELECT json_agg(
                    json_build_object(
                        'id',
                        id,
                        'created_at',
                        created_at,
                        'last_sign_in_at',
                        last_sign_in_at,
                        'days_inactive',
                        days_inactive
                    )
                )
            FROM user_stats
        )
    ) INTO result;
RETURN result;
END;
$$;