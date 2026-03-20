-- 20260320_period_reports.sql

CREATE TABLE IF NOT EXISTS period_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    module_name TEXT NOT NULL,
    period_key TEXT NOT NULL,
    context_notes TEXT,
    ai_draft TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(restaurant_id, module_name, period_key)
);

-- RLS
ALTER TABLE period_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own period reports"
    ON period_reports FOR SELECT
    USING (restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own period reports"
    ON period_reports FOR INSERT
    WITH CHECK (restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can update their own period reports"
    ON period_reports FOR UPDATE
    USING (restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can delete their own period reports"
    ON period_reports FOR DELETE
    USING (restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
    ));

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_period_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_period_reports_updated_at ON period_reports;
CREATE TRIGGER trigger_update_period_reports_updated_at
BEFORE UPDATE ON period_reports
FOR EACH ROW
EXECUTE FUNCTION update_period_reports_updated_at();
