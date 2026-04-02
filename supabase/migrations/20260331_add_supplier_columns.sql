ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS tax_id text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS payment_terms text,
ADD COLUMN IF NOT EXISTS reliability_score integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS trend_direction text DEFAULT 'stable',
ADD COLUMN IF NOT EXISTS total_orders integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_price_variance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS contract_renewal_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_price_audit timestamp with time zone;
