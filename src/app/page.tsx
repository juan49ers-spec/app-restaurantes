import { Suspense } from "react"
import { UnifiedDashboard } from "@/components/dashboard/UnifiedDashboard"
import { ExecutiveDashboard } from "@/components/dashboard/ExecutiveDashboard"
import { getDailySalesRange, getOperatingExpenses, getFiscalMetrics } from "@/app/actions/financial-control"
import { getCurrentRestaurant } from "@/app/actions/user"
import { createClient } from "@/lib/supabaseServer"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { redirect } from "next/navigation"
import { EXPENSE_GROUPS, DailySales, OperatingExpense } from "@/types/schema"

interface PageProps {
  searchParams: Promise<{
    from?: string
    to?: string
  }>
}

export default async function DashboardPage(props: PageProps) {
  const searchParams = await props.searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const ADMIN_EMAILS = ['juan49ers@gmail.com', 'admin@controlhub.com']
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())

  if (isAdmin) {
    redirect('/admin')
  }

  const restaurant = await getCurrentRestaurant()

  if (!restaurant) {
    redirect("/onboarding")
  }

  // Date Logic: Default to current month
  const now = new Date()
  const fromDate = searchParams.from || format(startOfMonth(now), 'yyyy-MM-dd')
  const toDate = searchParams.to || format(endOfMonth(now), 'yyyy-MM-dd')

  // Fetch Data in Parallel
  const [sales, expenses, fiscalMetrics] = await Promise.all([
    getDailySalesRange(restaurant.id, fromDate, toDate),
    getOperatingExpenses(restaurant.id, fromDate, toDate),
    getFiscalMetrics(restaurant.id, fromDate, toDate)
  ])

  // KPI Calculations
  const totalRevenue = sales.reduce((sum: number, day: DailySales) => sum + (day.revenue_total || 0), 0)

  // Expenses logic: Sum 'amount'. Note: 'amount' can be negative (e.g. inventory correction), so we just sum it.
  const totalExpenses = expenses.reduce((sum: number, exp: OperatingExpense) => sum + (exp.amount || 0), 0)

  const netProfit = totalRevenue - totalExpenses

  // Breakdown by Category Groups
  const laborCost = expenses
    .filter((e: OperatingExpense) => (EXPENSE_GROUPS.PERSONAL as readonly string[]).includes(e.category))
    .reduce((sum: number, e: OperatingExpense) => sum + (e.amount || 0), 0)

  const costOfGoods = expenses
    .filter((e: OperatingExpense) => (EXPENSE_GROUPS.COGS as readonly string[]).includes(e.category))
    .reduce((sum: number, e: OperatingExpense) => sum + (e.amount || 0), 0)

  const primeCost = laborCost + costOfGoods

  const financialHubData = {
    kpis: {
      totalRevenue,
      totalExpenses,
      netProfit,
      laborCost,
      costOfGoods,
      primeCost
    },
    sales,
    expenses
  }

  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-muted-foreground">Cargando Centro de Comando...</div>}>
      <UnifiedDashboard
        strategicView={<ExecutiveDashboard searchParams={{ from: searchParams.from, to: searchParams.to }} />}
        financialHubData={financialHubData}
        fiscalMetrics={fiscalMetrics}
        defaultDate={{ from: fromDate, to: toDate }}
      />
    </Suspense>
  )
}
