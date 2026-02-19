-- Add Tax fields to daily_sales
ALTER TABLE daily_sales
ADD COLUMN IF NOT EXISTS iva_collected numeric DEFAULT 0;
-- Add Tax fields to operating_expenses
ALTER TABLE operating_expenses
ADD COLUMN IF NOT EXISTS taxable_amount numeric,
    -- Base Imponible
ADD COLUMN IF NOT EXISTS tax_rate numeric,
    -- Tipo IVA (4, 10, 21)
ADD COLUMN IF NOT EXISTS tax_amount numeric,
    -- Cuota IVA
ADD COLUMN IF NOT EXISTS withholding_rate numeric,
    -- Tipo IRPF
ADD COLUMN IF NOT EXISTS withholding_amount numeric,
    -- Cuota IRPF
ADD COLUMN IF NOT EXISTS is_professional_invoice boolean DEFAULT false;
-- Comment on columns for documentation
COMMENT ON COLUMN daily_sales.iva_collected IS 'IVA Repercutido (Output VAT) collected from sales';
COMMENT ON COLUMN operating_expenses.taxable_amount IS 'Base Imponible for professional invoices';
COMMENT ON COLUMN operating_expenses.tax_amount IS 'Cuota IVA (Input VAT)';
COMMENT ON COLUMN operating_expenses.withholding_amount IS 'Retentions (IRPF) for professional services or rent';