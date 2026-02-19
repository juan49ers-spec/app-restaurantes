-- =====================================================
-- EMERGENCY SCHEMA FIX: Synchronization Month/Year & Missing Tables
-- =====================================================
-- 1. FIX: operating_expenses
DO $$ BEGIN -- Rename 'date' to 'expense_date' if 'date' exists
IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'operating_expenses'
        AND column_name = 'date'
) THEN
ALTER TABLE operating_expenses
    RENAME COLUMN "date" TO expense_date;
END IF;
-- Add 'month_year' if it doesn't exist
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'operating_expenses'
        AND column_name = 'month_year'
) THEN
ALTER TABLE operating_expenses
ADD COLUMN month_year TEXT;
END IF;
END $$;
-- Update existing records
UPDATE operating_expenses
SET month_year = TO_CHAR(expense_date, 'YYYY-MM')
WHERE month_year IS NULL;
ALTER TABLE operating_expenses
ALTER COLUMN month_year
SET NOT NULL;
-- 2. Trigger to auto-calculate month_year
CREATE OR REPLACE FUNCTION fn_populate_month_year() RETURNS TRIGGER AS $$ BEGIN NEW.month_year := TO_CHAR(NEW.expense_date, 'YYYY-MM');
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS tr_populate_month_year ON operating_expenses;
CREATE TRIGGER tr_populate_month_year BEFORE
INSERT
    OR
UPDATE OF expense_date ON operating_expenses FOR EACH ROW EXECUTE FUNCTION fn_populate_month_year();
-- 3. Create missing tables: monthly_targets
CREATE TABLE IF NOT EXISTS monthly_targets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
    month_year TEXT NOT NULL,
    -- YYYY-MM
    revenue_target NUMERIC DEFAULT 0 NOT NULL,
    cogs_target_pct NUMERIC DEFAULT 0 NOT NULL,
    labor_target_pct NUMERIC DEFAULT 0 NOT NULL,
    UNIQUE(restaurant_id, month_year)
);
ALTER TABLE monthly_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD their own targets" ON monthly_targets;
CREATE POLICY "Users can CRUD their own targets" ON monthly_targets FOR ALL USING (
    restaurant_id IN (
        SELECT id
        FROM restaurants
        WHERE owner_id = auth.uid()
    )
);
-- 4. Create missing tables: monthly_results
CREATE TABLE IF NOT EXISTS monthly_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
    month_year TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    month_name TEXT NOT NULL,
    is_closed BOOLEAN DEFAULT false,
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by UUID REFERENCES auth.users(id),
    -- Totals
    ingresos_netos NUMERIC NOT NULL DEFAULT 0,
    ingresos_extra NUMERIC NOT NULL DEFAULT 0,
    total_ingresos NUMERIC NOT NULL DEFAULT 0,
    personal_total NUMERIC NOT NULL DEFAULT 0,
    materia_prima_total NUMERIC NOT NULL DEFAULT 0,
    suministros NUMERIC NOT NULL DEFAULT 0,
    mantenimiento NUMERIC NOT NULL DEFAULT 0,
    marketing NUMERIC NOT NULL DEFAULT 0,
    gastos_extra NUMERIC NOT NULL DEFAULT 0,
    inversiones NUMERIC NOT NULL DEFAULT 0,
    financiaciones NUMERIC NOT NULL DEFAULT 0,
    -- Calculated
    resultado_bruto NUMERIC NOT NULL DEFAULT 0,
    resultado_neto NUMERIC NOT NULL DEFAULT 0,
    margen_neto NUMERIC NOT NULL DEFAULT 0,
    ratio_personal NUMERIC NOT NULL DEFAULT 0,
    ratio_materia_prima NUMERIC NOT NULL DEFAULT 0,
    ratio_gastos_fijos NUMERIC NOT NULL DEFAULT 0,
    break_even_punto NUMERIC NOT NULL DEFAULT 0,
    break_even_alcanzado BOOLEAN DEFAULT false,
    raw_data JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    UNIQUE(restaurant_id, month_year)
);
ALTER TABLE monthly_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD their own results" ON monthly_results;
CREATE POLICY "Users can CRUD their own results" ON monthly_results FOR ALL USING (
    restaurant_id IN (
        SELECT id
        FROM restaurants
        WHERE owner_id = auth.uid()
    )
);
-- 5. RPC: calculate_monthly_results
CREATE OR REPLACE FUNCTION calculate_monthly_results(
        p_restaurant_id UUID,
        p_year INTEGER,
        p_month INTEGER
    ) RETURNS monthly_results AS $$
DECLARE v_result monthly_results;
v_month_year TEXT;
v_start_date DATE;
v_total_ingresos NUMERIC;
v_personal_total NUMERIC;
v_materia_total NUMERIC;
v_otros_gastos NUMERIC;
v_inversiones NUMERIC;
v_financiaciones NUMERIC;
BEGIN v_month_year := p_year || '-' || LPAD(p_month::text, 2, '0');
v_start_date := MAKE_DATE(p_year, p_month, 1);
-- Ingresos Netos (desde daily_sales)
SELECT COALESCE(SUM(revenue_total - iva_collected), 0) INTO v_total_ingresos
FROM daily_sales
WHERE restaurant_id = p_restaurant_id
    AND date >= v_start_date
    AND date < v_start_date + INTERVAL '1 month';
-- Gastos (desde operating_expenses)
SELECT COALESCE(
        SUM(
            CASE
                WHEN category IN (
                    'NOMINAS_LIQUIDAS',
                    'SEGURIDAD_SOCIAL',
                    'EN_MANO_PERSONAL'
                ) THEN amount
                ELSE 0
            END
        ),
        0
    ),
    COALESCE(
        SUM(
            CASE
                WHEN category IN (
                    'PROVEEDORES_COMIDA',
                    'PROVEEDORES_BEBIDA',
                    'VARIACION_EXISTENCIAS'
                ) THEN amount
                ELSE 0
            END
        ),
        0
    ),
    COALESCE(
        SUM(
            CASE
                WHEN category IN (
                    'ALQUILER',
                    'SUMINISTROS',
                    'RECIBOS_SEGUROS',
                    'MANTENIMIENTO',
                    'PUBLICIDAD',
                    'GASTOS_EN_MANO',
                    'OTROS'
                ) THEN amount
                ELSE 0
            END
        ),
        0
    ),
    COALESCE(
        SUM(
            CASE
                WHEN category = 'INVERSIONES' THEN amount
                ELSE 0
            END
        ),
        0
    ),
    COALESCE(
        SUM(
            CASE
                WHEN category = 'FINANCIACION' THEN amount
                ELSE 0
            END
        ),
        0
    ) INTO v_personal_total,
    v_materia_total,
    v_otros_gastos,
    v_inversiones,
    v_financiaciones
FROM operating_expenses
WHERE restaurant_id = p_restaurant_id
    AND month_year = v_month_year;
-- Build result
v_result.restaurant_id := p_restaurant_id;
v_result.month_year := v_month_year;
v_result.year := p_year;
v_result.month := p_month;
v_result.month_name := TO_CHAR(v_start_date, 'Month');
v_result.total_ingresos := v_total_ingresos;
v_result.personal_total := v_personal_total;
v_result.materia_prima_total := v_materia_total;
v_result.inversiones := v_inversiones;
v_result.financiaciones := v_financiaciones;
v_result.resultado_bruto := v_total_ingresos - v_materia_total;
v_result.resultado_neto := v_total_ingresos - v_personal_total - v_materia_total - v_otros_gastos - v_financiaciones;
v_result.margen_neto := CASE
    WHEN v_total_ingresos > 0 THEN (v_result.resultado_neto / v_total_ingresos) * 100
    ELSE 0
END;
v_result.ratio_personal := CASE
    WHEN v_total_ingresos > 0 THEN (v_personal_total / v_total_ingresos) * 100
    ELSE 0
END;
v_result.ratio_materia_prima := CASE
    WHEN v_total_ingresos > 0 THEN (v_materia_total / v_total_ingresos) * 100
    ELSE 0
END;
v_result.break_even_punto := v_personal_total + v_otros_gastos + v_financiaciones;
v_result.break_even_alcanzado := v_total_ingresos >= v_result.break_even_punto;
RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 6. RPC: close_month
CREATE OR REPLACE FUNCTION close_month(
        p_restaurant_id UUID,
        p_year INTEGER,
        p_month INTEGER
    ) RETURNS monthly_results AS $$
DECLARE v_result monthly_results;
BEGIN v_result := calculate_monthly_results(p_restaurant_id, p_year, p_month);
v_result.is_closed := true;
v_result.closed_at := timezone('utc'::text, now());
v_result.closed_by := auth.uid();
INSERT INTO monthly_results (
        restaurant_id,
        month_year,
        year,
        month,
        month_name,
        is_closed,
        closed_at,
        closed_by,
        total_ingresos,
        personal_total,
        materia_prima_total,
        inversiones,
        financiaciones,
        resultado_bruto,
        resultado_neto,
        margen_neto,
        ratio_personal,
        ratio_materia_prima,
        break_even_punto,
        break_even_alcanzado
    )
VALUES (
        v_result.restaurant_id,
        v_result.month_year,
        v_result.year,
        v_result.month,
        v_result.month_name,
        v_result.is_closed,
        v_result.closed_at,
        v_result.closed_by,
        v_result.total_ingresos,
        v_result.personal_total,
        v_result.materia_prima_total,
        v_result.inversiones,
        v_result.financiaciones,
        v_result.resultado_bruto,
        v_result.resultado_neto,
        v_result.margen_neto,
        v_result.ratio_personal,
        v_result.ratio_materia_prima,
        v_result.break_even_punto,
        v_result.break_even_alcanzado
    ) ON CONFLICT (restaurant_id, month_year) DO
UPDATE
SET is_closed = EXCLUDED.is_closed,
    closed_at = EXCLUDED.closed_at,
    closed_by = EXCLUDED.closed_by,
    resultado_neto = EXCLUDED.resultado_neto,
    updated_at = timezone('utc'::text, now());
RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;