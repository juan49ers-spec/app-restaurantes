-- ==========================================
-- FASE 3.1: Reglas de Negocio Versionadas
-- ==========================================
-- Permite gestionar targets de COGS, labor, margins históricamente
-- y habilita simulaciones "What-If"

-- 1. Tabla de reglas de negocio versionadas
CREATE TABLE IF NOT EXISTS business_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    
    -- Identificación
    rule_name TEXT NOT NULL,
    rule_type TEXT NOT NULL, -- 'cogs_target', 'labor_target', 'margin_target', 'waste_threshold'
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Valores de la regla (JSONB flexible para diferentes tipos)
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Metadatos
    description TEXT,
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE DEFAULT NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- Auditoría
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_date_range CHECK (valid_until IS NULL OR valid_until >= valid_from),
    CONSTRAINT positive_version CHECK (version > 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_business_rules_restaurant_type 
ON business_rules(restaurant_id, rule_type);

CREATE INDEX IF NOT EXISTS idx_business_rules_active 
ON business_rules(restaurant_id, rule_type) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_business_rules_date_range 
ON business_rules(restaurant_id, rule_type, valid_from, valid_until);

-- 2. Tabla de alertas financieras
CREATE TABLE IF NOT EXISTS financial_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    
    -- Tipo y severidad
    alert_type TEXT NOT NULL, -- 'margin_deviation', 'expense_anomaly', 'waste_spike', 'stockout_risk'
    severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
    
    -- Contenido
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb, -- Datos estructurados del problema
    
    -- Estado
    is_read BOOLEAN DEFAULT false,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    
    -- Contexto
    entity_type TEXT, -- 'recipe', 'ingredient', 'expense', 'supplier'
    entity_id UUID,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_severity CHECK (severity IN ('info', 'warning', 'critical'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_financial_alerts_restaurant_unread 
ON financial_alerts(restaurant_id, is_read) 
WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_financial_alerts_restaurant_severity 
ON financial_alerts(restaurant_id, severity);

CREATE INDEX IF NOT EXISTS idx_financial_alerts_type_entity 
ON financial_alerts(restaurant_id, alert_type, entity_id);

-- 3. Función helper para obtener regla activa
CREATE OR REPLACE FUNCTION get_active_business_rule(
    p_restaurant_id UUID,
    p_rule_type TEXT,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    rule_id UUID,
    rule_name TEXT,
    value JSONB,
    valid_from DATE,
    version INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        br.id,
        br.rule_name,
        br.value,
        br.valid_from,
        br.version
    FROM business_rules br
    WHERE br.restaurant_id = p_restaurant_id
        AND br.rule_type = p_rule_type
        AND br.is_active = true
        AND br.valid_from <= p_date
        AND (br.valid_until IS NULL OR br.valid_until >= p_date)
    ORDER BY br.version DESC
    LIMIT 1;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_active_business_rule TO authenticated;

-- 4. Trigger para alertas automáticas al modificar recetas
CREATE OR REPLACE FUNCTION check_recipe_margin_alert()
RETURNS TRIGGER AS $$
DECLARE
    v_rule JSONB;
    v_current_margin NUMERIC;
    v_target_margin NUMERIC;
    v_warning_threshold NUMERIC;
    v_deviation NUMERIC;
BEGIN
    -- Obtener regla de margen activa
    SELECT * INTO v_rule
    FROM get_active_business_rule(
        NEW.restaurant_id,
        'margin_target',
        CURRENT_DATE
    );

    IF v_rule IS NULL THEN
        -- Usar valores por defecto si no hay regla configurada
        v_target_margin := 70.0; -- 70%
        v_warning_threshold := 5.0; -- ±5%
    ELSE
        v_target_margin := (v_rule->>'target_percentage')::NUMERIC;
        v_warning_threshold := COALESCE((v_rule->>'warning_threshold')::NUMERIC, 5.0);
    END IF;

    -- Calcular margen actual de la receta
    v_current_margin := CASE 
        WHEN NEW.selling_price > 0 
        THEN ((NEW.selling_price - NEW.current_cost) / NEW.selling_price) * 100
        ELSE 0
    END;

    -- Calcular desviación
    v_deviation := ABS(v_current_margin - v_target_margin);

    -- Crear alerta si la desviación supera el threshold
    IF v_deviation > v_warning_threshold THEN
        INSERT INTO financial_alerts (
            restaurant_id,
            alert_type,
            severity,
            title,
            description,
            metadata,
            entity_type,
            entity_id
        )
        VALUES (
            NEW.restaurant_id,
            'margin_deviation',
            CASE 
                WHEN v_deviation > v_warning_threshold * 2 THEN 'critical'
                ELSE 'warning'
            END,
            format('Margen desviado: %s', NEW.name),
            format(
                'El margen actual (%.1f%%) se desvía %.1f%% del target (%.1f%%)',
                v_current_margin,
                v_deviation,
                v_target_margin
            ),
            jsonb_build_object(
                'recipe_id', NEW.id,
                'recipe_name', NEW.name,
                'current_margin', v_current_margin,
                'target_margin', v_target_margin,
                'deviation', v_deviation
            ),
            'recipe',
            NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Crear trigger en recetas
DROP TRIGGER IF EXISTS check_recipe_margin_trigger ON recipes;
CREATE TRIGGER check_recipe_margin_trigger
    AFTER INSERT OR UPDATE ON recipes
    FOR EACH ROW
    EXECUTE FUNCTION check_recipe_margin_alert();

-- Comentarios para documentación
COMMENT ON TABLE business_rules IS 
'Registros de reglas de negocio versionadas por tiempo.
Permite mantener histórico de targets (COGS, labor, margins) y simulaciones What-If.

Ejemplos de rule_type:
- cogs_target: Target de costo de ventas (ej: 30%)
- labor_target: Target de costo laboral (ej: 25%)
- margin_target: Target de margen (ej: 70%)
- waste_threshold: Umbral de desperdicio aceptable (ej: 5%)
';

COMMENT ON TABLE financial_alerts IS 
'Alertas automáticas generadas por el sistema cuando se detectan anomalías financieras.
Tipos de alertas:
- margin_deviation: Desviación del margen target
- expense_anomaly: Gastos sin ventas correspondientes
- waste_spike: Aumento inusual de desperdicios
- stockout_risk: Riesgo de quiebra de stock';
