-- Historial de importaciones de informes mensuales PDF
CREATE TABLE IF NOT EXISTS report_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    month_key TEXT NOT NULL,              -- YYYY-MM
    file_name TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'upload', -- 'upload' | 'drive'
    status TEXT NOT NULL DEFAULT 'completed', -- 'completed' | 'partial' | 'error'
    confidence NUMERIC(3,2) DEFAULT 0,
    expenses_inserted INTEGER DEFAULT 0,
    sales_inserted BOOLEAN DEFAULT FALSE,
    -- Snapshot of extracted data for audit
    extracted_data JSONB,
    -- Comparison results
    discrepancies JSONB,                  -- Array of {field, pdf_value, db_value, diff_pct}
    drive_file_id TEXT,                   -- If imported from Google Drive
    errors TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),

    -- Prevent duplicate imports for same month
    UNIQUE(restaurant_id, month_key, file_name)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_report_imports_restaurant
    ON report_imports(restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_imports_month
    ON report_imports(restaurant_id, month_key);
