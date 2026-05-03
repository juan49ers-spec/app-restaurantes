import type { ExtractedMonthlyReport } from "@/lib/report-extractor"
import type { ComparisonResult } from "@/app/api/reports/compare/route"

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
