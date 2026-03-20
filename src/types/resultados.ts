// ==================== RESULTADOS MODULE TYPES ====================

export interface FinancialResult {
    month: string
    year: number
    
    // Ingresos
    ingresosNetos: number
    ingresosExtra: number
    totalIngresos: number
    
    // Gastos Operativos
    personal: {
        sueldosNetos: number
        seguridadSocial: number
        irpf: number
        total: number
        despidos?: number
        recMedico?: number
    }
    materiaPrima: {
        comida: number
        bebida: number
        variacionExistencias: number
        total: number
    }
    suministros: number
    suministrosFijos?: number
    suministrosVariables?: number
    mantenimiento: number
    marketing: number
    gastosExtra: number
    financiaciones: number
    
    // Inversiones (CAPEX)
    inversiones: number

    // Inventario (balance — no P&L)
    inventoryValue?: number

    // Resultados
    resultadoBruto: number
    resultadoNeto: number
    margenNeto: number
    
    // Ratios
    ratioPersonal: number
    ratioMateriaPrima: number
    ratioGastosFijos: number
}

export interface HistoricalData {
    months: string[]
    ingresos: number[]
    gastos: number[]
    resultados: number[]
}

export interface VarianceAnalysis {
    previousMonth: {
        resultado: number
        ingresos: number
        margen: number
    }
    currentMonth: {
        resultado: number
        ingresos: number
        margen: number
    }
    variacionVentas: number
    variacionMargen: number
    variacionGastosFijos: number
    variacionInversiones: number
    impactoTotal: number
}

export interface BreakEvenData {
    puntoEquilibrio: number
    diaBreakEven: number | null
    alcanzado: boolean
    ventasActuales: number
    costesFijos: number
    margenContribucion: number
}

export interface ConclusionRules {
    crecimiento: boolean
    rentabilidadSostenida: boolean
    alertaInventario: boolean
    rigidezLaboral: boolean
}

export interface GeneratedConclusion {
    text: string
    rules: ConclusionRules
    editable: boolean
    approved: boolean
}

// Waterfall Chart Data
export interface WaterfallItem {
    label: string
    value: number
    type: 'start' | 'positive' | 'negative' | 'end'
    category?: string
}

// ==========================================
// DATABASE TYPES (from Supabase)
// ==========================================

export interface MonthlyResult {
    id: string
    created_at: string
    updated_at: string
    restaurant_id: string
    month_year: string
    year: number
    month: number
    month_name: string
    is_closed: boolean
    closed_at?: string
    closed_by?: string
    
    // Ingresos
    ingresos_netos: number
    ingresos_extra: number
    total_ingresos: number
    
    // Personal
    personal_total: number
    personal_sueldos_netos: number
    personal_seguridad_social: number
    personal_irpf: number
    personal_despidos?: number
    personal_rec_medico?: number

    // Materia Prima
    materia_prima_total: number
    materia_prima_comida: number
    materia_prima_bebida: number
    materia_prima_variacion_existencias: number

    // Otros gastos
    suministros: number
    suministros_fijos?: number
    suministros_variables?: number
    mantenimiento: number
    marketing: number
    gastos_extra: number
    inversiones: number
    financiaciones: number
    
    // Resultados
    resultado_bruto: number
    resultado_neto: number
    margen_neto: number
    
    // Ratios
    ratio_personal: number
    ratio_materia_prima: number
    ratio_gastos_fijos: number
    
    // Inventario
    inventory_value?: number

    // Break-even
    break_even_punto: number
    break_even_dia?: number
    break_even_alcanzado: boolean
    
    // Comparativas
    vs_mes_anterior_pct?: number
    vs_mismo_mes_anio_anterior_pct?: number
    
    // Metadata
    raw_data?: Record<string, unknown>
    notes?: string
    tags?: string[]
}

export interface OperatingExpense {
    id: string
    created_at: string
    updated_at: string
    restaurant_id: string
    expense_date: string
    month_year: string
    category: 'personal' | 'materia_prima' | 'suministros' | 'mantenimiento' | 'marketing' | 'gastos_varios' | 'inversiones' | 'financiaciones'
    description?: string
    amount: number
    provider?: string
    invoice_number?: string
    details?: Record<string, unknown>
}
