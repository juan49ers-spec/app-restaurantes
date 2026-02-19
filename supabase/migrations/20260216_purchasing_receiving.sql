-- Add quantity_per_unit to supplier_aliases for unit conversion learning
ALTER TABLE supplier_aliases
ADD COLUMN IF NOT EXISTS quantity_per_unit NUMERIC NOT NULL DEFAULT 1;
COMMENT ON COLUMN supplier_aliases.quantity_per_unit IS 'Conversion factor: How many Master Units are in one Supplier Unit (e.g. 1 Case = 12 Bottles).';