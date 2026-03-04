-- Migration for Super Admin full access (FOR ALL)
-- Permite al Super Admin saltar todas las filas en RLS en operaciones de UPDATE, DELETE e INSERT.
-- Así, cuando use la característica "Log-in As...", no fallará al realizar cambios (si decidimos dejarle).
DO $$
DECLARE t_name text;
has_rls boolean;
BEGIN FOR t_name,
has_rls IN
SELECT tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public' LOOP IF has_rls THEN -- Check if a policy with this name already exists
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = t_name
            AND policyname = 'Super admin bypass ALL'
    ) THEN EXECUTE format(
        '
                    CREATE POLICY "Super admin bypass ALL" 
                    ON %I 
                    FOR ALL 
                    USING (public.is_super_admin()) 
                    WITH CHECK (public.is_super_admin());
                ',
        t_name
    );
END IF;
END IF;
END LOOP;
END;
$$;