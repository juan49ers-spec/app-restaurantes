// Types previously imported from missing modules — defined locally

export interface ExtractedMonthlyReport {
    month_name: string
    confidence: number
    billing: {
        total_revenue: number
        days_open: number
        delivery_uber_eats: number
        delivery_just_eat: number
        delivery_al_punto: number
        delivery_glovo: number
        card_pct: number
        cash_pct: number
        avg_daily_revenue: number
    }
    expenses: {
        total: number
        breakdown: Array<{ category: string; amount: number }>
    }
    pnl: {
        profit_loss: number
        profit_margin_pct: number
    }
    taxes: {
        iva_a_pagar: number
        iva_repercutido: number
    }
    ratios: {
        personal_pct: number
        materia_prima_pct: number
        suministros_pct: number
    }
    conclusions?: string
}

export interface Discrepancy {
    label: string
    severity: "ok" | "warn" | "error"
    pdf_value: number
    db_value: number
    diff: number
    diff_pct: number
}

export interface ComparisonResult {
    has_existing_data: boolean
    discrepancies: Discrepancy[]
    summary: {
        ok: number
        warnings: number
        errors: number
    }
}

export interface ReportImportRecord {
    created_at: string
    status: "completed" | "partial" | "error"
    month_key: string
    file_name: string
    source: "drive" | "manual"
    expenses_inserted: number
    sales_inserted: boolean
    confidence?: number
    discrepancies?: Array<{ label: string; severity: "ok" | "warn" | "error"; diff_pct: number }>
    errors?: string[]
}

export interface QueuedReport {
    file: File
    fileName: string
    report: ExtractedMonthlyReport | null
    comparison: ComparisonResult | null
    status: "pending" | "extracting" | "ready" | "inserting" | "done" | "error"
    error?: string
    dbResult?: { expenses_inserted: number; sales_inserted: boolean; errors: string[] }
}

export const fmt = (n: number) =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n)

export const fmtPct = (n: number) => `${n.toFixed(1)}%`
