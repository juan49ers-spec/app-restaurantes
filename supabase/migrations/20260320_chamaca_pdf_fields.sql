-- ============================================================
-- Migración: campos requeridos por el informe PDF (Chamaca)
-- ============================================================

-- 1. daily_sales: desglose delivery por plataforma + efectivo/tarjeta
-- ------------------------------------------------------------
ALTER TABLE daily_sales
  ADD COLUMN IF NOT EXISTS delivery_uber_eats   numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_just_eat    numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_al_punto    numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cash_amount          numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS card_amount          numeric(10,2) DEFAULT 0;

COMMENT ON COLUMN daily_sales.delivery_uber_eats  IS 'Ventas brutas (con IVA) canal Uber Eats';
COMMENT ON COLUMN daily_sales.delivery_just_eat   IS 'Ventas brutas (con IVA) canal Just Eat';
COMMENT ON COLUMN daily_sales.delivery_al_punto   IS 'Ventas brutas (con IVA) canal Al Punto';
COMMENT ON COLUMN daily_sales.cash_amount         IS 'Importe cobrado en efectivo';
COMMENT ON COLUMN daily_sales.card_amount         IS 'Importe cobrado con tarjeta';

-- 2. monthly_results: subcampos de personal, suministros e inventario
-- ------------------------------------------------------------
ALTER TABLE monthly_results
  -- Personal (desagregado según PDF)
  ADD COLUMN IF NOT EXISTS personal_despidos       numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS personal_rec_medico     numeric(10,2) DEFAULT 0,
  -- Suministros (fijos vs variables)
  ADD COLUMN IF NOT EXISTS suministros_fijos       numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suministros_variables   numeric(10,2) DEFAULT 0,
  -- Inventario (valor al cierre del mes)
  ADD COLUMN IF NOT EXISTS inventory_value         numeric(10,2) DEFAULT 0;

COMMENT ON COLUMN monthly_results.personal_despidos     IS 'Indemnizaciones y prorrateo de despidos del mes';
COMMENT ON COLUMN monthly_results.personal_rec_medico   IS 'Reconocimiento médico y formación del personal';
COMMENT ON COLUMN monthly_results.suministros_fijos     IS 'Suministros de coste fijo (alquiler luz base, etc.)';
COMMENT ON COLUMN monthly_results.suministros_variables IS 'Suministros variables (gas, extras, etc.)';
COMMENT ON COLUMN monthly_results.inventory_value       IS 'Valor del inventario al cierre del mes (€)';

-- 3. Índices de soporte para reportes de delivery
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_daily_sales_delivery
  ON daily_sales(restaurant_id, date)
  WHERE delivery_uber_eats > 0 OR delivery_just_eat > 0 OR delivery_al_punto > 0;
