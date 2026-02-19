import { getPurchaseAnalytics } from "@/app/actions/purchase-analytics"
import { getIngredients } from "@/app/actions/ingredients"
import { getPriceComparisons, getUnmappedItems, getSupplierItemMappings } from "@/app/actions/supplier-mapping"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, TrendingUp, DollarSign, Users, AlertTriangle, TrendingDown, Link2 } from "lucide-react"
import { SupplierComparisonModal } from "@/components/suppliers/SupplierComparisonModal"
import { SmartOrderWidget } from "@/components/purchasing/SmartOrderWidget"
import { MarketBenchmark } from "@/components/purchasing/MarketBenchmark"
import { ContractTracker } from "@/components/purchasing/ContractTracker"
import { PriceAlertConfig } from "@/components/purchasing/PriceAlertConfig"
import { PriceComparisonTable } from "@/components/purchasing/PriceComparisonTable"
import { SupplierItemMapper } from "@/components/purchasing/SupplierItemMapper"

export const dynamic = 'force-dynamic'

export default async function PurchaseAnalyticsPage() {
    const [analytics, ingredients, comparisons, unmappedItems, mappings] = await Promise.all([
        getPurchaseAnalytics(),
        getIngredients(),
        getPriceComparisons(),
        getUnmappedItems(),
        getSupplierItemMappings()
    ])

    const totalPotentialSavings = comparisons.reduce((sum, comp) => {
        const prices = comp.suppliers.map(s => s.price)
        const best = Math.min(...prices)
        const worst = Math.max(...prices)
        return sum + (worst - best)
    }, 0)

    const formatCurrency = (n: number) => `€${n.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Purchase Analytics</h1>
                    <p className="text-sm text-slate-500">Análisis de compras y optimización de costes</p>
                </div>
                <SupplierComparisonModal />
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4">
                <Card className="border-slate-200">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <DollarSign className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Gasto Total (6m)</p>
                                <p className="text-xl font-bold text-slate-900">{formatCurrency(analytics.summary.totalSpend)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Media Mensual</p>
                                <p className="text-xl font-bold text-slate-900">{formatCurrency(analytics.summary.avgMonthlySpend)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 rounded-lg">
                                <TrendingDown className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Ahorro Potencial</p>
                                <p className="text-xl font-bold text-emerald-600">€{totalPotentialSavings.toFixed(0)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <Link2 className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Sin Mapear</p>
                                <p className="text-xl font-bold text-slate-900">{unmappedItems.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Price Comparison & Mapping Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Resumen</TabsTrigger>
                    <TabsTrigger value="comparisons">
                        Comparador de Precios
                        {comparisons.length > 0 && (
                            <Badge variant="secondary" className="ml-2">{comparisons.length}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="mapping">
                        Mapeo de Productos
                        {unmappedItems.length > 0 && (
                            <Badge variant="secondary" className="ml-2">{unmappedItems.length}</Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    {/* Main Dashboard Grid */}
                    <div className="grid grid-cols-3 gap-6">
                        {/* Left Column - Spend by Category */}
                        <Card className="col-span-2 border-slate-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4" />
                                    Gasto por Categoría
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {analytics.spendByCategory.slice(0, 6).map(cat => (
                                        <div key={cat.category} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-medium text-slate-700">{cat.category}</span>
                                                <span className="text-slate-500">{formatCurrency(cat.amount)} ({cat.percentage.toFixed(0)}%)</span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                                                    style={{ width: `${cat.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Right Column - Smart Widgets */}
                        <div className="space-y-4">
                            <SmartOrderWidget />
                            <MarketBenchmark />
                            <PriceAlertConfig />
                            <ContractTracker />
                        </div>
                    </div>

                    {/* Bottom Row */}
                    <div className="grid grid-cols-2 gap-6">
                        {/* Top Suppliers */}
                        <Card className="border-slate-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Top Proveedores
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {analytics.topSuppliers.map((sup, i) => (
                                        <div key={sup.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                                                    {i + 1}
                                                </span>
                                                <span className="text-sm font-medium text-slate-700">{sup.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-bold text-slate-900">{formatCurrency(sup.totalSpend)}</span>
                                                <Badge variant="outline" className="ml-2 text-xs">{sup.invoiceCount} fact.</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Price Volatility */}
                        <Card className="border-slate-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Volatilidad de Precios
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {analytics.priceVolatility.slice(0, 5).map(item => (
                                        <div key={item.ingredientId} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                                            <span className="text-sm font-medium text-slate-700 truncate max-w-[150px]">{item.ingredientName}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500">
                                                    €{item.minPrice.toFixed(2)} - €{item.maxPrice.toFixed(2)}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className={item.volatility > 15 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-amber-50 text-amber-600 border-amber-200'}
                                                >
                                                    ±{item.volatility.toFixed(0)}%
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="comparisons">
                    <PriceComparisonTable comparisons={comparisons} />
                </TabsContent>

                <TabsContent value="mapping">
                    <SupplierItemMapper
                        unmappedItems={unmappedItems}
                        ingredients={ingredients}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
