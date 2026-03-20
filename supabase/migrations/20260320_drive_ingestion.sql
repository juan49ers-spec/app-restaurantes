-- Migración para el sistema de ingesta de datos desde Google Drive

-- 1. Añadir campos de trazabilidad a la tabla 'invoices' (si no existen)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'drive_file_id') THEN
        ALTER TABLE invoices ADD COLUMN drive_file_id TEXT;
        ALTER TABLE invoices ADD COLUMN drive_file_name TEXT;
        ALTER TABLE invoices ADD COLUMN extracted_data JSONB;
        ALTER TABLE invoices ADD COLUMN confidence_score NUMERIC(4,3) DEFAULT 0;
        ALTER TABLE invoices ADD COLUMN processing_error TEXT;
        
        -- Añadir índice para búsquedas rápidas por ID de fichero
        CREATE INDEX IF NOT EXISTS idx_invoices_drive_file_id ON invoices(drive_file_id);
    END IF;
END $$;


-- 2. Crear tabla de configuración de sincronización por restaurante
CREATE TABLE IF NOT EXISTS drive_sync_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    inbox_folder_id TEXT NOT NULL,
    processed_folder_id TEXT NOT NULL,
    review_folder_id TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Solo puede haber una configuración activa por restaurante
    UNIQUE(restaurant_id)
);


-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE drive_sync_config ENABLE ROW LEVEL SECURITY;

-- Políticas para drive_sync_config
CREATE POLICY "Users can view their restaurant's drive config"
    ON drive_sync_config FOR SELECT
    USING (
        restaurant_id IN (
            SELECT restaurant_id FROM user_roles WHERE user_id = auth.uid()
        )
        OR
        restaurant_id IN (
            SELECT id FROM restaurants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Owners and Admis can manage drive config"
    ON drive_sync_config FOR ALL
    USING (
        restaurant_id IN (
            SELECT restaurant_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
        OR
        restaurant_id IN (
            SELECT id FROM restaurants WHERE owner_id = auth.uid()
        )
    );

-- Trigger para updated_at
CREATE TRIGGER update_drive_sync_config_updated_at
    BEFORE UPDATE ON drive_sync_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
