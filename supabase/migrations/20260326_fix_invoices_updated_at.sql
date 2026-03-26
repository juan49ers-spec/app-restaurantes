-- Migración de emergencia: Añadir columna updated_at faltante en invoices
-- Requerida por el trigger update_invoices_updated_at

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Comentario informativo
COMMENT ON COLUMN invoices.updated_at IS 'Fecha de última actualización, gestionada automáticamente por trigger.';
