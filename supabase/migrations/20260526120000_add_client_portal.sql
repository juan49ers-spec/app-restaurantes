ALTER TABLE public.professional_report_drafts
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_professional_report_drafts_published
    ON public.professional_report_drafts (restaurant_id, published_at DESC)
    WHERE published_at IS NOT NULL;

ALTER TABLE public.restaurants
    ADD COLUMN IF NOT EXISTS consultant_name TEXT,
    ADD COLUMN IF NOT EXISTS consultant_email TEXT,
    ADD COLUMN IF NOT EXISTS consultant_logo_url TEXT;

CREATE TABLE IF NOT EXISTS public.portal_meeting_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    report_id UUID REFERENCES public.professional_report_drafts(id) ON DELETE SET NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACKNOWLEDGED', 'COMPLETED')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_meeting_requests_restaurant_created
    ON public.portal_meeting_requests (restaurant_id, created_at DESC);

ALTER TABLE public.portal_meeting_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portal_meeting_requests_select_own_restaurant"
    ON public.portal_meeting_requests;

CREATE POLICY "portal_meeting_requests_select_own_restaurant"
    ON public.portal_meeting_requests
    FOR SELECT
    USING (
        restaurant_id IN (
            SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "portal_meeting_requests_insert_own_restaurant"
    ON public.portal_meeting_requests;

CREATE POLICY "portal_meeting_requests_insert_own_restaurant"
    ON public.portal_meeting_requests
    FOR INSERT
    WITH CHECK (
        restaurant_id IN (
            SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "portal_meeting_requests_update_own_restaurant"
    ON public.portal_meeting_requests;

CREATE POLICY "portal_meeting_requests_update_own_restaurant"
    ON public.portal_meeting_requests
    FOR UPDATE
    USING (
        restaurant_id IN (
            SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
        )
    )
    WITH CHECK (
        restaurant_id IN (
            SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
        )
    );
