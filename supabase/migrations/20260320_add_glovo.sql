ALTER TABLE daily_sales ADD COLUMN IF NOT EXISTS delivery_glovo numeric(10,2) DEFAULT 0;
