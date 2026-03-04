-- Create global_broadcasts table
CREATE TABLE IF NOT EXISTS public.global_broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (
        severity IN ('INFO', 'WARNING', 'CRITICAL', 'SUCCESS')
    ),
    target_type TEXT NOT NULL DEFAULT 'ALL' CHECK (target_type IN ('ALL', 'SPECIFIC')),
    target_restaurant_ids UUID [] DEFAULT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT TRUE
);
-- Enable RLS
ALTER TABLE public.global_broadcasts ENABLE ROW LEVEL SECURITY;
-- 1. All authenticated users can read active and non-expired broadcasts
CREATE POLICY "Users can view active broadcasts" ON public.global_broadcasts FOR
SELECT USING (
        is_active = TRUE
        AND expires_at > NOW()
        AND (
            target_type = 'ALL'
            OR (
                target_type = 'SPECIFIC'
                AND (
                    EXISTS (
                        SELECT 1
                        FROM public.restaurants r
                        WHERE r.owner_id = auth.uid()
                            AND r.id = ANY(target_restaurant_ids)
                    )
                )
            )
        )
    );
-- 2. Only Super Admins can manage broadcasts (insert, update, delete)
CREATE POLICY "Super admins can manage broadcasts" ON public.global_broadcasts FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());