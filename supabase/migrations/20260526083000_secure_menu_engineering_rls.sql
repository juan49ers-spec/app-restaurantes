ALTER TABLE public.menu_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_report_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view menu reports for their restaurants"
    ON public.menu_reports;
CREATE POLICY "Users can view menu reports for their restaurants"
    ON public.menu_reports
    FOR SELECT
    USING (
        restaurant_id IN (
            SELECT id
            FROM public.restaurants
            WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert menu reports for their restaurants"
    ON public.menu_reports;
CREATE POLICY "Users can insert menu reports for their restaurants"
    ON public.menu_reports
    FOR INSERT
    WITH CHECK (
        restaurant_id IN (
            SELECT id
            FROM public.restaurants
            WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update menu reports for their restaurants"
    ON public.menu_reports;
CREATE POLICY "Users can update menu reports for their restaurants"
    ON public.menu_reports
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

DROP POLICY IF EXISTS "Users can delete menu reports for their restaurants"
    ON public.menu_reports;
CREATE POLICY "Users can delete menu reports for their restaurants"
    ON public.menu_reports
    FOR DELETE
    USING (
        restaurant_id IN (
            SELECT id
            FROM public.restaurants
            WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view menu report items for their restaurants"
    ON public.menu_report_items;
CREATE POLICY "Users can view menu report items for their restaurants"
    ON public.menu_report_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.menu_reports
            WHERE menu_reports.id = menu_report_items.report_id
                AND menu_reports.restaurant_id IN (
                    SELECT id
                    FROM public.restaurants
                    WHERE owner_id = auth.uid()
                )
        )
    );

DROP POLICY IF EXISTS "Users can insert menu report items for their restaurants"
    ON public.menu_report_items;
CREATE POLICY "Users can insert menu report items for their restaurants"
    ON public.menu_report_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.menu_reports
            WHERE menu_reports.id = menu_report_items.report_id
                AND menu_reports.restaurant_id IN (
                    SELECT id
                    FROM public.restaurants
                    WHERE owner_id = auth.uid()
                )
        )
    );

DROP POLICY IF EXISTS "Users can update menu report items for their restaurants"
    ON public.menu_report_items;
CREATE POLICY "Users can update menu report items for their restaurants"
    ON public.menu_report_items
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM public.menu_reports
            WHERE menu_reports.id = menu_report_items.report_id
                AND menu_reports.restaurant_id IN (
                    SELECT id
                    FROM public.restaurants
                    WHERE owner_id = auth.uid()
                )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.menu_reports
            WHERE menu_reports.id = menu_report_items.report_id
                AND menu_reports.restaurant_id IN (
                    SELECT id
                    FROM public.restaurants
                    WHERE owner_id = auth.uid()
                )
        )
    );

DROP POLICY IF EXISTS "Users can delete menu report items for their restaurants"
    ON public.menu_report_items;
CREATE POLICY "Users can delete menu report items for their restaurants"
    ON public.menu_report_items
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM public.menu_reports
            WHERE menu_reports.id = menu_report_items.report_id
                AND menu_reports.restaurant_id IN (
                    SELECT id
                    FROM public.restaurants
                    WHERE owner_id = auth.uid()
                )
        )
    );
