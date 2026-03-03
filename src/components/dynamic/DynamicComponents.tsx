import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

export const DynamicCFOOverview = dynamic(
  () => import('@/components/dashboard/CFOOverview').then(mod => ({ default: mod.CFOOverview })),
  {
    loading: () => <Skeleton className="w-full h-48 rounded-[2rem]" />,
    ssr: true
  }
)

export const DynamicExecutiveDashboard = dynamic(
  () => import('@/components/dashboard/ExecutiveDashboardClient').then(mod => ({ default: mod.ExecutiveDashboardClient })),
  {
    loading: () => <Skeleton className="w-full h-96 rounded-[2rem]" />,
    ssr: false
  }
)

export const DynamicBCGMatrix = dynamic(
  () => import('@/components/dashboard/BCGMatrix').then(mod => ({ default: mod.BCGMatrix })),
  {
    loading: () => <Skeleton className="w-full h-80 rounded-[2rem]" />,
    ssr: false
  }
)

export const DynamicTaxPulse = dynamic(
  () => import('@/components/dashboard/TaxPulse').then(mod => ({ default: mod.TaxPulse })),
  {
    loading: () => <Skeleton className="w-full h-32 rounded-[2rem]" />,
    ssr: true
  }
)

export const DynamicPriceSpikeAlerts = dynamic(
  () => import('@/components/dashboard/PriceSpikeAlerts').then(mod => ({ default: mod.PriceSpikeAlerts })),
  {
    loading: () => <Skeleton className="w-full h-40 rounded-[2rem]" />,
    ssr: true
  }
)

export const DynamicAISuggestionsPanel = dynamic(
  () => import('@/components/dashboard/AISuggestionsPanel').then(mod => ({ default: mod.AISuggestionsPanel })),
  {
    loading: () => <Skeleton className="w-full h-64 rounded-[2rem]" />,
    ssr: false
  }
)

export const DynamicStaffingAlerts = dynamic(
  () => import('@/components/dashboard/StaffingAlerts').then(mod => ({ default: mod.StaffingAlerts })),
  {
    loading: () => <Skeleton className="w-full h-40 rounded-[2rem]" />,
    ssr: true
  }
)

export const DynamicBudgetVariance = dynamic(
  () => import('@/components/dashboard/BudgetVariance').then(mod => ({ default: mod.BudgetVariance })),
  {
    loading: () => <Skeleton className="w-full h-48 rounded-[2rem]" />,
    ssr: true
  }
)

export const DynamicInflationWatchlist = dynamic(
  () => import('@/components/dashboard/InflationWatchlist').then(mod => ({ default: mod.InflationWatchlist })),
  {
    loading: () => <Skeleton className="w-full h-64 rounded-[2rem]" />,
    ssr: true
  }
)

export const DynamicGhostProducts = dynamic(
  () => import('@/components/dashboard/GhostProducts').then(mod => ({ default: mod.GhostProducts })),
  {
    loading: () => <Skeleton className="w-full h-56 rounded-[2rem]" />,
    ssr: true
  }
)

export const DynamicIngredientDialog = dynamic(
  () => import('@/components/ingredients/IngredientDialog').then(mod => ({ default: mod.IngredientDialog })),
  {
    loading: () => <Skeleton className="w-full h-96 rounded-[2rem]" />,
    ssr: false
  }
)

export const DynamicInvoiceReviewForm = dynamic(
  () => import('@/components/invoices/InvoiceReviewForm').then(mod => ({ default: mod.InvoiceReviewForm })),
  {
    loading: () => <Skeleton className="w-full h-[600px] rounded-[2rem]" />,
    ssr: false
  }
)

export const DynamicMenuEngineeringMatrix = dynamic(
  () => import('@/components/menu-engineering/EngineeringMatrix').then(mod => ({ default: mod.EngineeringMatrix })),
  {
    loading: () => <Skeleton className="w-full h-[500px] rounded-[2rem]" />,
    ssr: false
  }
)

export const DynamicRecipeHistory = dynamic(
  () => import('@/components/recipes/RecipeHistory').then(mod => ({ default: mod.RecipeHistory })),
  {
    loading: () => <Skeleton className="w-full h-64 rounded-[2rem]" />,
    ssr: true
  }
)