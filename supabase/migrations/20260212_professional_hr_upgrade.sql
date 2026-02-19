-- Migration: Professional HR Schema Upgrade
-- Description: Aligns the database with the application code.
-- Renames staff → employees, staff_id → employee_id, splits name → first_name + last_name.
-- Resolves Error 42703 (Undefined Column)
-- 0. Ensure handle_updated_at function exists
CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ language 'plpgsql';
-- ═══════════════════════════════════════════════
-- 1. RENAME TABLE: staff → employees
-- ═══════════════════════════════════════════════
ALTER TABLE IF EXISTS public.staff
    RENAME TO employees;
-- ═══════════════════════════════════════════════
-- 2. EMPLOYEES: Rename and add columns
-- ═══════════════════════════════════════════════
-- Split 'name' into 'first_name' and 'last_name'
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS last_name TEXT;
-- Migrate data from 'name' → first_name / last_name
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'employees'
        AND column_name = 'name'
) THEN
UPDATE public.employees
SET first_name = split_part(name, ' ', 1),
    last_name = COALESCE(
        NULLIF(
            substring(
                name
                from position(' ' in name) + 1
            ),
            ''
        ),
        '-'
    )
WHERE first_name IS NULL;
ALTER TABLE public.employees DROP COLUMN IF EXISTS name;
END IF;
END $$;
-- Set NOT NULL after migration (with defaults for safety)
DO $$ BEGIN -- Set defaults for any remaining NULLs
UPDATE public.employees
SET first_name = 'Sin'
WHERE first_name IS NULL;
UPDATE public.employees
SET last_name = 'Nombre'
WHERE last_name IS NULL;
-- Now set NOT NULL
ALTER TABLE public.employees
ALTER COLUMN first_name
SET NOT NULL;
ALTER TABLE public.employees
ALTER COLUMN last_name
SET NOT NULL;
END $$;
-- Add professional columns
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS monthly_base_salary DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT 'INDEFINIDO';
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS contract_hours_weekly DECIMAL(5, 2) DEFAULT 40;
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS social_security_number TEXT;
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS color_code TEXT DEFAULT '#3b82f6';
-- ═══════════════════════════════════════════════
-- 3. SHIFTS: Rename staff_id → employee_id, add columns
-- ═══════════════════════════════════════════════
ALTER TABLE public.shifts
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE;
-- Migrate staff_id → employee_id if staff_id still exists
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'shifts'
        AND column_name = 'staff_id'
) THEN
UPDATE public.shifts
SET employee_id = staff_id
WHERE employee_id IS NULL;
ALTER TABLE public.shifts DROP COLUMN IF EXISTS staff_id;
END IF;
END $$;
-- Add professional shift columns
ALTER TABLE public.shifts
ADD COLUMN IF NOT EXISTS shift_type TEXT DEFAULT 'OTRO';
ALTER TABLE public.shifts
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled';
ALTER TABLE public.shifts
ADD COLUMN IF NOT EXISTS break_minutes INTEGER DEFAULT 0;
ALTER TABLE public.shifts
ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.shifts
ADD COLUMN IF NOT EXISTS notes TEXT;
-- ═══════════════════════════════════════════════
-- 4. POLICIES: Recreate with correct schema
-- ═══════════════════════════════════════════════
DROP TABLE IF EXISTS public.policies CASCADE;
CREATE TABLE public.policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- ═══════════════════════════════════════════════
-- 5. Constraints (idempotent)
-- ═══════════════════════════════════════════════
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'check_contract_type'
) THEN
ALTER TABLE public.employees
ADD CONSTRAINT check_contract_type CHECK (
        contract_type IN (
            'INDEFINIDO',
            'TEMPORAL',
            'PRACTICAS',
            'AUTONOMO',
            'OTRO'
        )
    );
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'check_shift_type'
) THEN
ALTER TABLE public.shifts
ADD CONSTRAINT check_shift_type CHECK (
        shift_type IN ('DESAYUNO', 'ALMUERZO', 'CENA', 'EVENTO', 'OTRO')
    );
END IF;
END $$;
-- ═══════════════════════════════════════════════
-- 6. RLS & Triggers
-- ═══════════════════════════════════════════════
DROP TRIGGER IF EXISTS tr_policies_updated_at ON public.policies;
CREATE TRIGGER tr_policies_updated_at BEFORE
UPDATE ON public.policies FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
-- Drop old staff RLS policy if it exists (table was renamed)
DROP POLICY IF EXISTS "Users can manage staff for their restaurants" ON public.employees;
DROP POLICY IF EXISTS "Users can manage employees for their restaurants" ON public.employees;
CREATE POLICY "Users can manage employees for their restaurants" ON public.employees FOR ALL USING (
    restaurant_id IN (
        SELECT id
        FROM public.restaurants
        WHERE owner_id = auth.uid()
    )
);
DROP POLICY IF EXISTS "Users can manage policies for their restaurants" ON public.policies;
CREATE POLICY "Users can manage policies for their restaurants" ON public.policies FOR ALL USING (
    restaurant_id IN (
        SELECT id
        FROM public.restaurants
        WHERE owner_id = auth.uid()
    )
);
-- ═══════════════════════════════════════════════
-- 7. Indexes
-- ═══════════════════════════════════════════════
DROP INDEX IF EXISTS idx_staff_restaurant;
CREATE INDEX IF NOT EXISTS idx_employees_active ON public.employees(restaurant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_shifts_type ON public.shifts(restaurant_id, shift_type);
CREATE INDEX IF NOT EXISTS idx_policies_category ON public.policies(restaurant_id, category);