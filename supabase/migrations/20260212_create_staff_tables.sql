-- Migration: Create Staff, Shifts, and Policies tables
-- Description: Sets up the data layer for the Structure module with RLS.
-- 1. Staff Members Table
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    hourly_rate DECIMAL(10, 2) DEFAULT 0,
    color_code TEXT DEFAULT '#3b82f6',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- 2. Shifts Table
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_minutes INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- 3. Policies Table
CREATE TABLE IF NOT EXISTS public.policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT,
    file_url TEXT,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- 4. Enable RLS
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
-- 5. RLS Policies (Restaurant Isolation)
-- Staff
CREATE POLICY "Users can manage staff for their restaurants" ON public.staff FOR ALL USING (
    restaurant_id IN (
        SELECT id
        FROM public.restaurants
        WHERE owner_id = auth.uid()
    )
);
-- Shifts
CREATE POLICY "Users can manage shifts for their restaurants" ON public.shifts FOR ALL USING (
    restaurant_id IN (
        SELECT id
        FROM public.restaurants
        WHERE owner_id = auth.uid()
    )
);
-- Policies
CREATE POLICY "Users can manage policies for their restaurants" ON public.policies FOR ALL USING (
    restaurant_id IN (
        SELECT id
        FROM public.restaurants
        WHERE owner_id = auth.uid()
    )
);
-- 6. Trigger for updated_at on policies
CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ language 'plpgsql';
CREATE TRIGGER tr_policies_updated_at BEFORE
UPDATE ON public.policies FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
-- 7. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_restaurant ON public.staff(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_shifts_restaurant_date ON public.shifts(restaurant_id, date);
CREATE INDEX IF NOT EXISTS idx_policies_restaurant ON public.policies(restaurant_id);