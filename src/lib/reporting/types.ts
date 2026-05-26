import type { DailySales, OperatingExpenseCategory } from '@/types/schema'

export type ReportSectionId =
  | 'executive_summary'
  | 'sales'
  | 'costs'
  | 'staff'
  | 'suppliers'
  | 'menu_performance'
  | 'menu_engineering'
  | 'profitability'
  | 'recommendations'
  | 'data_appendix'

export type DataQualityStatus = 'OK' | 'PARTIAL' | 'MISSING' | 'CONFLICT'
export type ReportMetricKind = 'actual' | 'estimated' | 'derived' | 'not_available'
export type ReportSeverity = 'info' | 'warning' | 'critical'

export interface ReportPeriod {
  from: string
  to: string
  days: number
}

export interface RestaurantIdentity {
  id: string
  name: string
}

export interface ReportSourceRef {
  id: string
  label: string
  tables: string[]
  calculation: string
  kind: ReportMetricKind
  requiredFor: ReportSectionId[]
}

export interface ReportEvidence {
  sourceId: string
  tables: string[]
  rowCount: number
  kind: ReportMetricKind
  notes?: string
}

export interface DataQualityIssue {
  id: string
  section: ReportSectionId
  status: Exclude<DataQualityStatus, 'OK'>
  severity: ReportSeverity
  message: string
  sourceIds: string[]
}

export interface SectionQuality {
  section: ReportSectionId
  status: DataQualityStatus
  confidence: number
  issues: DataQualityIssue[]
  evidence: ReportEvidence[]
}

export interface ReportMetric {
  id: string
  label: string
  value: number | string | null
  unit: 'eur' | 'pct' | 'count' | 'days' | 'text'
  kind: ReportMetricKind
  sourceIds: string[]
}

export interface ProfessionalReportSection {
  id: ReportSectionId
  title: string
  quality: SectionQuality
  metrics: ReportMetric[]
  narrative: string[]
}

export interface ExecutiveSummary {
  headline: string
  keyFindings: string[]
  blockingIssues: DataQualityIssue[]
}

export interface ProfessionalRestaurantReport {
  schemaVersion: 'professional-report/v1'
  generatedAt: string
  restaurant: RestaurantIdentity
  period: ReportPeriod
  quality: {
    status: DataQualityStatus
    confidence: number
    issues: DataQualityIssue[]
  }
  sourceMap: ReportSourceRef[]
  executiveSummary: ExecutiveSummary
  sections: ProfessionalReportSection[]
}

export type SalesReportRow = Pick<
  DailySales,
  | 'date'
  | 'revenue_total'
  | 'base_10'
  | 'base_21'
  | 'tax_10'
  | 'tax_21'
  | 'revenue_dine_in'
  | 'revenue_takeout'
  | 'revenue_delivery'
  | 'total_covers'
  | 'labor_hours'
  | 'cost_of_goods'
  | 'labor_cost'
  | 'day_status'
>

export interface ExpenseReportRow {
  expense_date: string
  category: OperatingExpenseCategory
  amount: number
  tax_amount?: number | null
  withholding_amount?: number | null
  is_professional_invoice?: boolean | null
}

export interface MonthlyTargetReportRow {
  month_year: string
  revenue_target: number
  cogs_target_pct: number
  labor_target_pct: number
}

export interface EmployeeReportRow {
  id: string
  role: string
  status: 'ACTIVE' | 'INACTIVE'
  hourly_rate?: number | null
  monthly_base_salary?: number | null
  contract_hours_weekly?: number | null
}

export interface ShiftReportRow {
  date: string
  status?: string | null
  estimated_cost?: number | null
  actual_cost?: number | null
}

export interface SupplierReportRow {
  id: string
  name: string
  reliability_score?: number | null
  trend_direction?: 'improving' | 'stable' | 'declining' | null
  total_orders?: number | null
  avg_price_variance?: number | null
}

export interface InvoiceReportRow {
  date?: string | null
  status: string
  total_amount?: number | null
  supplier_id?: string | null
}

export interface DailyRecipeSalesReportRow {
  date: string
  recipe_id: string
  quantity_sold: number
}

export interface RecipeReportRow {
  id: string
  name: string
  selling_price?: number | null
  current_cost?: number | null
}

export type MenuEngineeringClassification = 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG'

export interface MenuEngineeringReportItemRow {
  id: string
  name: string
  classification?: MenuEngineeringClassification | null
  quantity_sold?: number | null
  contribution_margin?: number | null
  total_sales?: number | null
  total_profit?: number | null
  popularity_pct?: number | null
}

export interface MenuEngineeringReportRow {
  id: string
  name: string
  date_from?: string | null
  date_to?: string | null
  avg_popularity?: number | null
  avg_margin?: number | null
  items: MenuEngineeringReportItemRow[]
}

export interface ProfessionalReportInput {
  restaurant: RestaurantIdentity
  period: ReportPeriod
  sales: SalesReportRow[]
  expenses: ExpenseReportRow[]
  monthlyTargets: MonthlyTargetReportRow[]
  employees: EmployeeReportRow[]
  shifts: ShiftReportRow[]
  suppliers: SupplierReportRow[]
  invoices: InvoiceReportRow[]
  recipeSales: DailyRecipeSalesReportRow[]
  recipes: RecipeReportRow[]
  menuEngineeringReport?: MenuEngineeringReportRow | null
  generatedAt?: string
}
