/**
 * Financial Constants
 * 
 * Valores constantes utilizados en cálculos financieros.
 * Documenta el porqué de cada número mágico.
 */

/**
 * Factores de ajuste para proyecciones de ventas
 * Basado en análisis históricos de patrones de consumo
 */
export const PROJECTION_FACTORS = {
    /**
     * Multiplicador para fines de semana (viernes/sábado)
     * Históricamente las ventas aumentan ~20% estos días
     */
    WEEKEND_MULTIPLIER: 1.2,

    /**
     * Multiplicador para días laborables
     * Sin ajuste significativo
     */
    WEEKDAY_MULTIPLIER: 1.0,
} as const

/**
 * Estimaciones de impacto financiero
 * Valores conservadores para cálculos de alertas
 */
export const INFLATION_ESTIMATES = {
    /**
     * Impacto estimado en euros por cada alerta de spike de precio
     * Basado en: volumen promedio afectado × incremento de precio
     */
    PER_ALERT_IMPACT_EUR: 50,
} as const

/**
 * Ratios de gastos por defecto para estimaciones
 * Utilizados cuando no hay datos históricos detallados
 */
export const EXPENSE_RATIOS = {
    /**
     * Porcentaje de ventas destinado a Coste de Bienes (COGS)
     * Estándar industria: 25-35%
     */
    DEFAULT_COGS_PCT: 0.30,     // 30%

    /**
     * Porcentaje de ventas destinado a Personal
     * Estándar industria: 30-35%
     */
    DEFAULT_LABOR_PCT: 0.35,   // 35%

    /**
     * Porcentaje de ventas destinado a Gastos Fijos
     * Incluye: alquiler, suministros, seguros, mantenimiento
     */
    DEFAULT_FIXED_PCT: 0.35,     // 35%
} as const

/**
 * Objetivos de ratios financieros (KPIs)
 * Metas a alcanzar para restaurante saludable
 */
export const TARGET_RATIOS = {
    /**
     * Coste Personal objetivo como % de ventas
     * Ideal: 28-33%
     */
    PERSONAL_TARGET_PCT: 33,

    /**
     * Coste Materia Prima objetivo como % de ventas
     * Ideal: 28-32%
     */
    COGS_TARGET_PCT: 33,

    /**
     * Prime Cost objetivo (Personal + COGS)
     * Ideal: ≤ 60% de ventas
     */
    PRIME_COST_MAX_PCT: 60,
} as const

/**
 * Categorías de gastos para agrupación
 */
export const EXPENSE_CATEGORIES = {
    PERSONAL: [
        'NOMINAS_LIQUIDAS',
        'SEGURIDAD_SOCIAL',
        'EN_MANO_PERSONAL'
    ] as const,

    COGS: [
        'PROVEEDORES_COMIDA',
        'PROVEEDORES_BEBIDA',
        'VARIACION_EXISTENCIAS'
    ] as const,

    INVESTMENTS: [
        'INVERSIONES'
    ] as const,
} as const

/**
 * Utilidades de validación
 */
export const isPersonalCategory = (category: string): boolean =>
    (EXPENSE_CATEGORIES.PERSONAL as readonly string[]).includes(category)

export const isCOGSCategory = (category: string): boolean =>
    (EXPENSE_CATEGORIES.COGS as readonly string[]).includes(category)

export const isInvestmentCategory = (category: string): boolean =>
    (EXPENSE_CATEGORIES.INVESTMENTS as readonly string[]).includes(category)
