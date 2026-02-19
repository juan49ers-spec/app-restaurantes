
import { FinancialDiagnosis } from "@/app/actions/financial-diagnosis"
import { BCGMetrics, GhostProduct } from "@/app/actions/financial-engine"
export type { BCGMetrics, GhostProduct }
import { StaffEfficiencySummary } from "@/app/actions/staff-optimization"

export interface PulseData {
    bcg: BCGMetrics | null
    ghosts: GhostProduct[]
    kpis: {
        totalRevenue: number
        totalGhostRevenue: number
    } | null
}

export interface DashboardData {
    financial: FinancialDiagnosis | null
    engine: PulseData | null
    staff: StaffEfficiencySummary | null
}
