-- 1. Create audit_logs table for tracing changes (Compliance)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by UUID,
    -- Can be NULL if modified by system/service-role
    created_at TIMESTAMPTZ DEFAULT now(),
    restaurant_id UUID
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_restaurant_id ON public.audit_logs(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
-- 2. Generic Trigger Function for Audit Logging
CREATE OR REPLACE FUNCTION public.fn_audit_log_trigger() RETURNS TRIGGER AS $$
DECLARE v_old_data JSONB;
v_new_data JSONB;
v_restaurant_id UUID;
v_record_id TEXT;
v_user_id UUID;
BEGIN -- Extract active user from auth context
BEGIN v_user_id := auth.uid();
EXCEPTION
WHEN OTHERS THEN v_user_id := NULL;
END;
IF TG_OP = 'UPDATE' THEN v_old_data := to_jsonb(OLD);
v_new_data := to_jsonb(NEW);
v_record_id := v_new_data->>'id';
v_restaurant_id := (v_new_data->>'restaurant_id')::UUID;
ELSIF TG_OP = 'DELETE' THEN v_old_data := to_jsonb(OLD);
v_record_id := v_old_data->>'id';
v_restaurant_id := (v_old_data->>'restaurant_id')::UUID;
ELSIF TG_OP = 'INSERT' THEN v_new_data := to_jsonb(NEW);
v_record_id := v_new_data->>'id';
v_restaurant_id := (v_new_data->>'restaurant_id')::UUID;
END IF;
INSERT INTO public.audit_logs(
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        changed_by,
        restaurant_id
    )
VALUES (
        TG_TABLE_NAME,
        v_record_id,
        TG_OP,
        v_old_data,
        v_new_data,
        v_user_id,
        v_restaurant_id
    );
RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 3. Attach triggers to high-value Operational & Financial tables
DROP TRIGGER IF EXISTS trg_audit_daily_sales ON public.daily_sales;
CREATE TRIGGER trg_audit_daily_sales
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON public.daily_sales FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();
DROP TRIGGER IF EXISTS trg_audit_operating_expenses ON public.operating_expenses;
CREATE TRIGGER trg_audit_operating_expenses
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON public.operating_expenses FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();
DROP TRIGGER IF EXISTS trg_audit_employees ON public.employees;
CREATE TRIGGER trg_audit_employees
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();
DROP TRIGGER IF EXISTS trg_audit_recipes ON public.recipes;
CREATE TRIGGER trg_audit_recipes
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_trigger();
-- 4. Set up RBAC Basis
CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS TEXT AS $$ BEGIN -- If no role is set in metadata, default to 'admin' to preserve backwards compatibility for the lone founder right now
    RETURN COALESCE(
        (
            SELECT raw_user_meta_data->>'role'
            FROM auth.users
            WHERE id = auth.uid()
        ),
        'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Enforce Strict RBAC on Security & Financial Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can see audit logs" ON public.audit_logs FOR
SELECT USING (
        restaurant_id::text = (
            SELECT raw_user_meta_data->>'restaurant_id'
            FROM auth.users
            WHERE id = auth.uid()
        )
        AND public.get_user_role() = 'admin'
    );
-- Enforce Strict RBAC on Employees Table (e.g. non-admins shouldn't see salaries, but we can restrict entire row visibility for non-admins to start)
-- First drop the old general policies if they exist (though Employees might not have one yet or they do from previous step)
-- We will just recreate the policies with explicit IF NOT EXISTS or OR REPLACE via DROP first to ensure clean state.
DROP POLICY IF EXISTS "Users can view own restaurant employees" ON public.employees;
DROP POLICY IF EXISTS "Users can view employees" ON public.employees;
CREATE POLICY "Admins can view all employee data" ON public.employees FOR
SELECT USING (
        restaurant_id::text = (
            SELECT raw_user_meta_data->>'restaurant_id'
            FROM auth.users
            WHERE id = auth.uid()
        )
        AND public.get_user_role() = 'admin'
    );
-- "staff" can view only their own records (assuming their user_id is linked, though our schema might not have user_id, it just has restaurant_id. Let's assume everyone but admin can't see employees table to protect PII & salaries for now).
-- Wait, if a manager adds an invoice or expense, they need explicit insert policies
-- (Assuming they were just global before)