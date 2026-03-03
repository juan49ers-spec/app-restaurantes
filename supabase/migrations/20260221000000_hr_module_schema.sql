-- Migration: HR Module Schema (Estructura)
-- Description: Creates the 'employees' and 'shifts' tables with RLS and optimized fields
-- ==========================================
-- 1. EMPLOYEES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    -- HR details
    role TEXT NOT NULL DEFAULT 'OTHER',
    -- e.g., 'KITCHEN_HEAD', 'FLOOR_MANAGER'
    system_access_level TEXT NOT NULL DEFAULT 'NONE',
    -- 'ADMIN', 'MANAGER', 'STAFF', 'NONE'
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    -- 'ACTIVE', 'INACTIVE'
    -- Contact & Identifiers
    email TEXT,
    phone TEXT,
    social_security_number TEXT,
    emergency_contact TEXT,
    -- Contract & Compensation
    contract_type TEXT NOT NULL DEFAULT 'INDEFINIDO',
    contract_hours_weekly NUMERIC(5, 2) DEFAULT 40,
    wage_type TEXT NOT NULL DEFAULT 'HOURLY',
    -- 'HOURLY', 'SALARIED', 'MIXED'
    hourly_rate NUMERIC(10, 2) DEFAULT 0,
    monthly_base_salary NUMERIC(10, 2) DEFAULT 0,
    -- UI Helpers
    color_code TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- ==========================================
-- 2. SHIFTS TABLE (Horarios)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    -- Scheduling
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    -- Actuals (for time tracking & variance)
    actual_start_time TIME,
    actual_end_time TIME,
    break_minutes INTEGER DEFAULT 0,
    shift_type TEXT,
    -- e.g., 'DESAYUNO', 'ALMUERZO', 'CENA'
    status TEXT NOT NULL DEFAULT 'SCHEDULED',
    -- 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
    -- Estimated/Actual Cost tracking
    estimated_cost NUMERIC(10, 2) DEFAULT 0,
    actual_cost NUMERIC(10, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- ==========================================
-- INDEXES & TRIGGERS
-- ==========================================
-- Indexes for performance on frequently queried fields
CREATE INDEX IF NOT EXISTS employees_restaurant_id_idx ON public.employees(restaurant_id);
CREATE INDEX IF NOT EXISTS employees_status_idx ON public.employees(status);
CREATE INDEX IF NOT EXISTS shifts_restaurant_id_idx ON public.shifts(restaurant_id);
CREATE INDEX IF NOT EXISTS shifts_employee_id_idx ON public.shifts(employee_id);
CREATE INDEX IF NOT EXISTS shifts_date_idx ON public.shifts(date);
-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS trigger AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_employees_updated_at BEFORE
UPDATE ON public.employees FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER update_shifts_updated_at BEFORE
UPDATE ON public.shifts FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
-- Policies for employees
CREATE POLICY "Users can view employees of their restaurants" ON public.employees FOR
SELECT USING (
        auth.uid() IN (
            SELECT owner_id
            FROM public.restaurants
            WHERE id = restaurant_id
        )
    );
CREATE POLICY "Users can insert employees to their restaurants" ON public.employees FOR
INSERT WITH CHECK (
        auth.uid() IN (
            SELECT owner_id
            FROM public.restaurants
            WHERE id = restaurant_id
        )
    );
CREATE POLICY "Users can update employees of their restaurants" ON public.employees FOR
UPDATE USING (
        auth.uid() IN (
            SELECT owner_id
            FROM public.restaurants
            WHERE id = restaurant_id
        )
    );
CREATE POLICY "Users can delete employees of their restaurants" ON public.employees FOR DELETE USING (
    auth.uid() IN (
        SELECT owner_id
        FROM public.restaurants
        WHERE id = restaurant_id
    )
);
-- Policies for shifts
CREATE POLICY "Users can view shifts of their restaurants" ON public.shifts FOR
SELECT USING (
        auth.uid() IN (
            SELECT owner_id
            FROM public.restaurants
            WHERE id = restaurant_id
        )
    );
CREATE POLICY "Users can insert shifts to their restaurants" ON public.shifts FOR
INSERT WITH CHECK (
        auth.uid() IN (
            SELECT owner_id
            FROM public.restaurants
            WHERE id = restaurant_id
        )
    );
CREATE POLICY "Users can update shifts of their restaurants" ON public.shifts FOR
UPDATE USING (
        auth.uid() IN (
            SELECT owner_id
            FROM public.restaurants
            WHERE id = restaurant_id
        )
    );
CREATE POLICY "Users can delete shifts of their restaurants" ON public.shifts FOR DELETE USING (
    auth.uid() IN (
        SELECT owner_id
        FROM public.restaurants
        WHERE id = restaurant_id
    )
);