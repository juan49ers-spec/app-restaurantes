-- Create billing_modules table
CREATE TABLE IF NOT EXISTS public.billing_modules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0,
    price_yearly NUMERIC(10, 2) NOT NULL DEFAULT 0,
    is_base BOOLEAN NOT NULL DEFAULT false,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- Enable RLS
ALTER TABLE public.billing_modules ENABLE ROW LEVEL SECURITY;
-- Policies
-- Read access: All authenticated users can read (needed for checkout/subscription pages eventually)
CREATE POLICY "billing_modules_read_all" ON public.billing_modules FOR
SELECT TO authenticated USING (true);
-- Write/Update/Delete access: Only super admins
-- Note: Assuming you have a function is_super_admin() like in other files
CREATE POLICY "billing_modules_admin_all" ON public.billing_modules FOR ALL TO authenticated USING (public.is_super_admin());
-- Insert Seed Data (Migration initialization mapping from plan-definitions.ts)
INSERT INTO public.billing_modules (
        id,
        name,
        description,
        price_monthly,
        price_yearly,
        is_base,
        features
    )
VALUES (
        'core',
        'Control Financiero',
        'Módulo base fundamental para la gestión económica de tu restaurante',
        30.00,
        300.00,
        true,
        '["Cuentas de Perdidas y Ganancias", "Previsión de impuestos", "Facturación centralizada", "Soporte estándar"]'::jsonb
    ),
    (
        'operativa',
        'Operativa y Recetas',
        'Desbloquea escandallos avanzados y control de la ingeniería del menú',
        15.00,
        150.00,
        false,
        '["Escandallos", "Ingeniería de Menú", "Control de Stock", "Desperdicios"]'::jsonb
    ),
    (
        'personal',
        'Gestión de Personal',
        'Directorio completo, cuadrantes inteligentes de turnos y políticas HR',
        15.00,
        150.00,
        false,
        '["Directorio de Equipo", "Generador de Turnos Smart", "Políticas Documentadas", "Control de Asistencia"]'::jsonb
    ),
    (
        'proveedores',
        'Control de Proveedores',
        'Gestión de cartera, tracking de pedidos y control de mermas externas',
        10.00,
        100.00,
        false,
        '["Base de Datos de Proveedores", "Tracking de Pedidos", "Histórico de Tratos", "Gestión Integral"]'::jsonb
    ) ON CONFLICT (id) DO
UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    is_base = EXCLUDED.is_base,
    features = EXCLUDED.features;