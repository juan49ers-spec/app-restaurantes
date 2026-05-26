CREATE TABLE IF NOT EXISTS public.professional_report_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    period_from DATE NOT NULL,
    period_to DATE NOT NULL,
    version INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'REVIEWED', 'READY')),
    schema_version TEXT NOT NULL,
    report_snapshot JSONB NOT NULL,
    narrative_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    exported_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT professional_report_drafts_period_check CHECK (period_from <= period_to),
    CONSTRAINT professional_report_drafts_version_check CHECK (version > 0),
    CONSTRAINT professional_report_drafts_version_unique UNIQUE (restaurant_id, period_from, period_to, version)
);

CREATE INDEX IF NOT EXISTS idx_professional_report_drafts_restaurant_period
    ON public.professional_report_drafts (restaurant_id, period_from, period_to);

CREATE INDEX IF NOT EXISTS idx_professional_report_drafts_restaurant_updated
    ON public.professional_report_drafts (restaurant_id, updated_at DESC);

CREATE OR REPLACE FUNCTION public.touch_professional_report_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_professional_report_drafts_updated_at
    ON public.professional_report_drafts;

CREATE TRIGGER trg_professional_report_drafts_updated_at
    BEFORE UPDATE ON public.professional_report_drafts
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_professional_report_drafts_updated_at();

ALTER TABLE public.professional_report_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view professional report drafts for their restaurants"
    ON public.professional_report_drafts;
CREATE POLICY "Users can view professional report drafts for their restaurants"
    ON public.professional_report_drafts
    FOR SELECT
    USING (
        restaurant_id IN (
            SELECT id
            FROM public.restaurants
            WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert professional report drafts for their restaurants"
    ON public.professional_report_drafts;
CREATE POLICY "Users can insert professional report drafts for their restaurants"
    ON public.professional_report_drafts
    FOR INSERT
    WITH CHECK (
        restaurant_id IN (
            SELECT id
            FROM public.restaurants
            WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update professional report drafts for their restaurants"
    ON public.professional_report_drafts;
CREATE POLICY "Users can update professional report drafts for their restaurants"
    ON public.professional_report_drafts
    FOR UPDATE
    USING (
        restaurant_id IN (
            SELECT id
            FROM public.restaurants
            WHERE owner_id = auth.uid()
        )
    )
    WITH CHECK (
        restaurant_id IN (
            SELECT id
            FROM public.restaurants
            WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete professional report drafts for their restaurants"
    ON public.professional_report_drafts;
CREATE POLICY "Users can delete professional report drafts for their restaurants"
    ON public.professional_report_drafts
    FOR DELETE
    USING (
        restaurant_id IN (
            SELECT id
            FROM public.restaurants
            WHERE owner_id = auth.uid()
        )
    );
