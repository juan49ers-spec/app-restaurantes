-- Add billing fields to restaurants table
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS current_plan TEXT DEFAULT 'FREE' CHECK (
        current_plan IN ('FREE', 'STARTER', 'PRO', 'ENTERPRISE')
    ),
    ADD COLUMN IF NOT EXISTS plan_updated_at TIMESTAMPTZ DEFAULT NOW();
-- Create billing_events table for audit and history
CREATE TABLE IF NOT EXISTS public.billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (
        event_type IN (
            'PLAN_CHANGE',
            'CREDIT_ADJUSTMENT',
            'PAYMENT',
            'REFUND'
        )
    ),
    amount NUMERIC DEFAULT 0,
    -- monetary amount or credit amount depending on event
    details JSONB DEFAULT '{}'::jsonb,
    -- Store previous/new plan, reason, etc.
    created_by UUID REFERENCES auth.users(id) ON DELETE
    SET NULL,
        -- Null if created by system/webhook in the future
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- RLS
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
-- Admins can manage all billing events
CREATE POLICY "Super admins can manage billing events" ON public.billing_events FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
-- Users can view their own restaurant's billing events
CREATE POLICY "Users can view their restaurant billing events" ON public.billing_events FOR
SELECT USING (
        restaurant_id IN (
            SELECT id
            FROM public.restaurants
            WHERE owner_id = auth.uid()
        )
    );
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS billing_events_restaurant_id_idx ON public.billing_events(restaurant_id);
CREATE INDEX IF NOT EXISTS billing_events_created_at_idx ON public.billing_events(created_at DESC);