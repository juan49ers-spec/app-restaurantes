-- 20260326_add_ocr_metadata_columns.sql
-- Añade columnas para seguimiento de calidad y motor OCR

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS ocr_provider TEXT,
ADD COLUMN IF NOT EXISTS ocr_confidence NUMERIC;

-- Comentario para documentación en DB
COMMENT ON COLUMN invoices.ocr_provider IS 'Motor OCR utilizado para la extracción (chandra, gemini, ollama, etc.)';
COMMENT ON COLUMN invoices.ocr_confidence IS 'Nivel de confianza de la extracción (0 a 1)';
