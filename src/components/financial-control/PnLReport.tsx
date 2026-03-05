'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

import { DailySales, OperatingExpense } from '@/types/schema'
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Area, AreaChart, LineChart } from 'recharts'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, DollarSign, Activity, Calculator, Download } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { exportPnLToPDF, exportPnLToExcel } from "@/lib/export-utils"
import FinancialSimulator from "./FinancialSimulator"
interface PnLReportProps {
    sales: DailySales[]
    expenses: OperatingExpense[]
    currentDate?: Date
    activeMetric?: string
}

export function PnLReport({ sales, expenses, currentDate = new Date(), activeMetric = 'revenue' }: PnLReportProps) {
    const [activeTab, setActiveTab] = useState("chart") // Switch to chart by default to show off interactivity

    // --- Data Processing ---
    const financialData = useMemo(() => {
        // ... (Keep existing Revenue/Expense breakdown logic - unchanged) ...
        // 1. Revenue Breakdown
        const revenue = {
            dineIn: sales.reduce((sum, s) => sum + (s.revenue_dine_in || 0), 0),
            takeout: sales.reduce((sum, s) => sum + (s.revenue_takeout || 0), 0),
            delivery: sales.reduce((sum, s) => sum + (s.revenue_delivery || 0), 0),
            total: sales.reduce((sum, s) => sum + (s.revenue_total || 0), 0)
        }

        // 2. Expense Breakdown
        const expenseMap = new Map<string, number>()
        let totalExpenses = 0
        expenses.forEach(exp => {
            const amount = Number(exp.amount) || 0
            const category = exp.category || 'OTHER'
            expenseMap.set(category, (expenseMap.get(category) || 0) + amount)
            totalExpenses += amount
        })

        const expenseCategories = [
            { id: 'COGS_FOOD', label: 'Coste Materia Prima' },
            { id: 'LABOR_PAYROLL', label: 'Personal' },
            { id: 'OCCUPANCY_RENT', label: 'Alquiler Local' },
            { id: 'OCCUPANCY_UTILITIES', label: 'Suministros' },
            { id: 'MARKETING', label: 'Marketing' },
            { id: 'OTHER', label: 'Otros Gastos' },
        ]

        const reportExpenses = Array.from(expenseMap.entries()).map(([id, amount]) => {
            const label = expenseCategories.find(c => c.id === id)?.label || id
            return { id, label, amount, pct: revenue.total > 0 ? (amount / revenue.total) * 100 : 0 }
        }).sort((a, b) => b.amount - a.amount)

        // 3. Net Profit
        const netProfit = revenue.total - totalExpenses
        const netProfitMargin = revenue.total > 0 ? (netProfit / revenue.total) * 100 : 0

        // 4. Enhanced Chart Data
        const start = startOfMonth(currentDate)
        const end = endOfMonth(currentDate)
        const days = eachDayOfInterval({ start, end })

        const chartData = days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const daySales = sales.filter(s => isSameDay(new Date(s.date), day))
            const dayExpenses = expenses.filter(e => isSameDay(new Date(e.expense_date), day))

            const dailyRevenue = daySales.reduce((sum, s) => sum + (s.revenue_total || 0), 0)
            const dailyRevenueDineIn = daySales.reduce((sum, s) => sum + (s.revenue_dine_in || 0), 0)
            const dailyRevenueTakeout = daySales.reduce((sum, s) => sum + (s.revenue_takeout || 0) + (s.revenue_delivery || 0), 0)

            const dailyExpensesTotal = dayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)

            // Calculate specific costs for Prime Cost
            // Note: In a real app, logic would be more complex connecting specific expense IDs to Labor/COGS
            // For now, we simulate or grab from seeding if available
            const dailyLabor = daySales.reduce((sum, s) => sum + (s.labor_cost || 0), 0)
            const dailyCOGS = daySales.reduce((sum, s) => sum + (s.cost_of_goods || 0), 0)

            return {
                date: format(day, 'd', { locale: es }),
                fullDate: dateStr,
                // Revenue
                revenue: dailyRevenue,
                revenue_dineIn: dailyRevenueDineIn,
                revenue_takeout: dailyRevenueTakeout,
                // Costs
                expenses: dailyExpensesTotal,
                labor: dailyLabor,
                cogs: dailyCOGS,
                prime_cost: dailyLabor + dailyCOGS,
                prime_target: dailyRevenue * 0.60, // 60% Target
                // Profit
                profit: dailyRevenue - dailyExpensesTotal
            }
        })

        return {
            revenue,
            totalExpenses,
            netProfit,
            netProfitMargin,
            reportExpenses,
            chartData
        }
    }, [sales, expenses, currentDate])

    // --- Helper Formatters ---
    const formatCurrency = (value: number) => new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value)
    const formatPct = (value: number) => `${value.toFixed(2)}%`

    // --- Export Function ---
    const handleExport = (type: 'pdf' | 'excel') => {
        if (type === 'pdf') {
            exportPnLToPDF(financialData, `Mes Actual ${new Date().getFullYear()}`)
        } else {
            exportPnLToExcel(financialData, `Mes Actual ${new Date().getFullYear()}`)
        }
    }

    // --- CHART CONFIG ---
    // Colors: Purple (Revenue), Slate (Expenses), Green/Red (Profit)

    // Custom Tooltip for Chart
    const CustomTooltip = ({ active, payload, label }: { active?: boolean, payload?: { name: string; value: number; color: string }[], label?: string }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 p-3 rounded-lg shadow-xl outline-none ring-1 ring-black/5">
                    <p className="text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wide">{label}</p>
                    {payload.map((entry, index: number) => {
                        // Hack for gradient colors in tooltips
                        const color = entry.color?.toString().startsWith('url')
                            ? (entry.name === 'Ingresos' ? '#10b981' : entry.name === 'Neto' ? '#10b981' : '#f43f5e')
                            : entry.color
                        return (
                            <div key={index} className="flex items-center gap-2 text-sm mb-1">
                                <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                                <span className="text-neutral-600 dark:text-neutral-400 capitalize">{entry.name}:</span>
                                <span className="font-bold font-mono text-neutral-900 dark:text-neutral-100">
                                    {(Number(entry.value) || 0).toLocaleString('es-ES', {
                                        style: 'currency',
                                        currency: 'EUR',
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })}
                                </span>
                            </div>
                        )
                    })}
                </div>
            )
        }
        return null
    }

    // --- Dynamic Chart Config ---
    const renderChart = () => {
        if (activeMetric === 'net-profit') {
            return (
                <AreaChart data={financialData.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                    <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area type="monotone" dataKey="profit" stroke="#10b981" fill="url(#colorProfit)" strokeWidth={2} />
                </AreaChart>
            )
        }

        if (activeMetric === 'prime-cost') {
            return (
                <ComposedChart data={financialData.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                    <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                        formatter={(value: number | undefined, name: string | undefined) => [formatCurrency(value || 0), name === 'labor' ? 'Personal' : name === 'cogs' ? 'Materia Prima' : 'Objetivo 60%']}
                    />
                    <Bar dataKey="cogs" stackId="bs" fill="#f59e0b" radius={[0, 0, 4, 4]} barSize={32} />
                    <Bar dataKey="labor" stackId="bs" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
                    <Line type="monotone" dataKey="prime_target" stroke="#ec4899" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                </ComposedChart>
            )
        }

        // Default: Revenue
        return (
            <ComposedChart data={financialData.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: '#f5f5f5', opacity: 0.5 }}
                />
                <Bar dataKey="revenue" name="Ingresos" fill="url(#colorRevenue)" radius={[4, 4, 0, 0]} barSize={32} />
                <Line type="monotone" dataKey="expenses" name="Gastos" stroke="#f43f5e" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="profit" name="Neto" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
            </ComposedChart>
        )
    }

    return (
        <Card className="h-full border border-neutral-200 dark:border-neutral-800 shadow-sm bg-white dark:bg-neutral-900 flex flex-col">
            <CardHeader className="border-b border-neutral-100 dark:border-neutral-800 pb-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
                            {activeMetric === 'net-profit' ? <TrendingUp className="w-5 h-5 text-emerald-600" /> :
                                activeMetric === 'prime-cost' ? <Activity className="w-5 h-5 text-blue-600" /> :
                                    <DollarSign className="w-5 h-5 text-emerald-600" />}

                            {activeMetric === 'net-profit' ? 'Evolución Beneficio (EBITDA)' :
                                activeMetric === 'prime-cost' ? 'Análisis Coste Primo' :
                                    'Ingresos vs Gastos'}
                        </CardTitle>
                        <CardDescription className="text-xs uppercase tracking-wider font-medium text-neutral-500">
                            {format(currentDate, 'MMMM yyyy', { locale: es })}
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                            <TabsList className="h-8 bg-neutral-100 dark:bg-neutral-800 p-1">
                                <TabsTrigger value="chart" className="text-xs h-6 px-3">Gráfico</TabsTrigger>
                                <TabsTrigger value="simulacion" className="gap-2 text-xs h-6 px-3">
                                    <Calculator className="w-4 h-4" />
                                    Simulación
                                </TabsTrigger>
                                <TabsTrigger value="table" className="text-xs h-6 px-3">Tabla</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <div className="flex gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2 hidden sm:flex">
                                        <Download className="h-4 w-4" />
                                        Exportar
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => handleExport('pdf')} className="cursor-pointer">
                                        <span className="flex items-center gap-2">📄 PDF (Oficial)</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExport('excel')} className="cursor-pointer">
                                        <span className="flex items-center gap-2">📊 Excel (Detallado)</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">

                    {/* --- CHART VIEW --- */}
                    <TabsContent value="chart" className="flex-1 min-h-[400px] w-full p-6">
                        <ResponsiveContainer width="100%" height="100%">
                            {renderChart()}
                        </ResponsiveContainer>
                    </TabsContent>

                    {/* --- SIMULATOR VIEW --- */}
                    <TabsContent value="simulacion" className="flex-1 w-full bg-neutral-50/50 dark:bg-neutral-900/10 overflow-hidden">
                        {/* 🔮 SIMULATOR INTEGRATION */}
                        <FinancialSimulator financialData={financialData} />
                    </TabsContent>

                    {/* --- TABLE VIEW --- */}
                    <TabsContent value="table" className="flex-1 overflow-auto bg-white dark:bg-neutral-950">
                        <div className="min-w-[700px]">
                            <Table>
                                <TableHeader className="bg-neutral-50 dark:bg-neutral-900 sticky top-0 z-10 shadow-sm">
                                    <TableRow className="border-b border-neutral-200 dark:border-neutral-800">
                                        <TableHead className="w-[35%] pl-8 py-4 text-[11px] uppercase font-bold text-neutral-500 tracking-widest">Concepto</TableHead>
                                        <TableHead className="w-[20%] text-center py-4 text-[11px] uppercase font-bold text-neutral-500 tracking-widest">Tendencia (30d)</TableHead>
                                        <TableHead className="text-right py-4 text-[11px] uppercase font-bold text-neutral-500 tracking-widest">Importe</TableHead>
                                        <TableHead className="w-[15%] text-right pr-8 py-4 text-[11px] uppercase font-bold text-neutral-500 tracking-widest">% Ventas</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="text-sm">
                                    {/* --- INGRESOS --- */}
                                    <TableRow className="bg-neutral-50/50 dark:bg-neutral-900/30">
                                        <TableCell colSpan={4} className="py-3 pl-8 font-bold text-neutral-800 dark:text-neutral-200 text-xs tracking-wide uppercase">
                                            Ventas Totales (Dinero que entra)
                                        </TableCell>
                                    </TableRow>

                                    {/* Dine In - With Sparkline */}
                                    <TableRow className="group hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors border-0">
                                        <TableCell className="pl-12 py-3 font-medium text-neutral-600 dark:text-neutral-400">Sala (Lo que se come aquí)</TableCell>
                                        <TableCell className="py-2 px-4 h-[40px]">
                                            <div className="h-full w-24 mx-auto opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={financialData.chartData}>
                                                        <Line type="monotone" dataKey="revenue_dineIn" stroke="#10b981" strokeWidth={2} dot={false} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums text-neutral-900 dark:text-white font-medium">{formatCurrency(financialData.revenue.dineIn)}</TableCell>
                                        <TableCell className="text-right pr-4 tabular-nums text-emerald-600 font-medium">{formatPct(100 * financialData.revenue.dineIn / (financialData.revenue.total || 1))}</TableCell>
                                    </TableRow>

                                    <TableRow className="group hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors border-0">
                                        <TableCell className="pl-12 py-3 font-medium text-neutral-600 dark:text-neutral-400">Para Llevar / Delivery</TableCell>
                                        <TableCell className="py-2 px-4 h-[40px]">
                                            <div className="h-full w-24 mx-auto opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={financialData.chartData}>
                                                        <Line type="monotone" dataKey="revenue_takeout" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums text-neutral-900 dark:text-white font-medium">{formatCurrency(financialData.revenue.takeout + financialData.revenue.delivery)}</TableCell>
                                        <TableCell className="text-right pr-4 tabular-nums text-blue-600 font-medium">{formatPct(100 * (financialData.revenue.takeout + financialData.revenue.delivery) / (financialData.revenue.total || 1))}</TableCell>
                                    </TableRow>

                                    <TableRow className="border-y border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900">
                                        <TableCell className="pl-8 py-3 font-bold text-neutral-900 dark:text-white text-sm">TOTAL VENTAS</TableCell>
                                        <TableCell />
                                        <TableCell className="text-right tabular-nums font-bold text-neutral-900 dark:text-white text-sm">{formatCurrency(financialData.revenue.total)}</TableCell>
                                        <TableCell className="text-right pr-8 tabular-nums font-bold text-emerald-600 dark:text-emerald-400 text-sm">100.00%</TableCell>
                                    </TableRow>

                                    <TableRow className="h-4 border-none hover:bg-transparent"><TableCell colSpan={4} /></TableRow>

                                    {/* --- PRIME COST (The Holy Grail) --- */}
                                    <TableRow className="bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50/80 transition-colors">
                                        <TableCell colSpan={4} className="py-2 pl-8 font-bold text-blue-800 dark:text-blue-200 text-xs tracking-wide uppercase flex items-center gap-2">
                                            Gastos Principales (Prime Cost) <span className="opacity-50 font-normal normal-case">- Comida + Equipo (Lo crítico)</span>
                                        </TableCell>
                                    </TableRow>

                                    {/* Simulated Prime Breakdown (Matches Chart Logic) */}
                                    {/* In a real scenario, we'd map specific expense categories to these buckets */}
                                    {[
                                        { label: 'Compras (Materia Prima)', amount: financialData.reportExpenses.find(e => e.id === 'COGS_FOOD')?.amount || 0, color: '#f59e0b', id: 'cogs' },
                                        { label: 'Nóminas (Equipo)', amount: financialData.reportExpenses.find(e => e.id === 'LABOR_PAYROLL')?.amount || 0, color: '#3b82f6', id: 'labor' }
                                    ].map(item => {
                                        const pct = (item.amount / (financialData.revenue.total || 1)) * 100
                                        // 🚨 THRESHOLD LOGIC: Food Cost > 35% or Labor > 35% is DANGER
                                        const isHigh = pct > 35
                                        return (
                                            <TableRow key={item.label} className="group hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors border-0">
                                                <TableCell className="pl-12 py-3 font-medium text-neutral-600 dark:text-neutral-400 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                                    {item.label}
                                                </TableCell>
                                                <TableCell className="py-2 px-4 h-[40px]">
                                                    <div className="h-full w-24 mx-auto opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <LineChart data={financialData.chartData}>
                                                                {/* Using simulated daily split for sparkline visualization */}
                                                                <Line type="monotone" dataKey={item.id} stroke={item.color} strokeWidth={2} dot={false} />
                                                            </LineChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums text-neutral-900 dark:text-white font-medium">{formatCurrency(item.amount)}</TableCell>
                                                <TableCell className="relative h-full p-0 pr-8 align-middle">
                                                    <div className="flex items-center justify-end h-full w-full relative">
                                                        {/* DATA BAR BACKGROUND */}
                                                        <div className={`absolute right-4 top-1/2 -translate-y-1/2 h-6 rounded-sm opacity-20 ${isHigh ? 'bg-red-500' : 'bg-neutral-400'}`}
                                                            style={{ width: `${Math.min(pct, 100)}%` } as any} />
                                                        <span className={`tabular-nums z-10 font-bold ${isHigh ? 'text-red-600' : 'text-neutral-600'}`}>{formatPct(pct)}</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}

                                    {/* PRIME COST TOTAL */}
                                    {(() => {
                                        const primeTotal = (financialData.reportExpenses.find(e => e.id === 'COGS_FOOD')?.amount || 0) + (financialData.reportExpenses.find(e => e.id === 'LABOR_PAYROLL')?.amount || 0)
                                        const primePct = (primeTotal / (financialData.revenue.total || 1)) * 100
                                        const isPrimeDanger = primePct > 65 // Prime Cost > 60-65% is dangerous
                                        return (
                                            <TableRow className={`border-y border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-900/10 font-bold ${isPrimeDanger ? 'text-red-700' : 'text-blue-800'}`}>
                                                <TableCell className="pl-12 py-2 text-xs uppercase tracking-wider">Total Gastos Principales</TableCell>
                                                <TableCell className="text-center text-[10px] opacity-70 font-normal">Objetivo: &lt;60.00%</TableCell>
                                                <TableCell className="text-right tabular-nums">{formatCurrency(primeTotal)}</TableCell>
                                                <TableCell className="text-right pr-8 tabular-nums">{formatPct(primePct)}</TableCell>
                                            </TableRow>
                                        )
                                    })()}

                                    <TableRow className="h-4 border-none hover:bg-transparent"><TableCell colSpan={4} /></TableRow>

                                    {/* --- OTHER EXPENSES --- */}
                                    <TableRow className="bg-neutral-50/50 dark:bg-neutral-900/30">
                                        <TableCell colSpan={4} className="py-3 pl-8 font-bold text-neutral-800 dark:text-neutral-200 text-xs tracking-wide uppercase">
                                            Gastos Fijos (Alquiler, Luz, Gestión...)
                                        </TableCell>
                                    </TableRow>

                                    {financialData.reportExpenses.filter(e => !['COGS_FOOD', 'LABOR_PAYROLL'].includes(e.id)).map((exp) => (
                                        <TableRow key={exp.id} className="group hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors border-0">
                                            <TableCell className="pl-12 py-3 font-medium text-neutral-600 dark:text-neutral-400">{exp.label}</TableCell>
                                            <TableCell className="text-center text-[10px] text-neutral-300">
                                                {/* No daily sparkline for fixed costs usually available/relevant per category yet */}
                                                <div className="w-full text-center opacity-20">-</div>
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums text-neutral-900 dark:text-white font-medium">{formatCurrency(exp.amount)}</TableCell>
                                            <TableCell className="relative h-full p-0 pr-8 align-middle">
                                                <div className="flex items-center justify-end h-full w-full relative">
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 h-6 rounded-sm opacity-20 bg-neutral-400"
                                                        style={{ width: `${Math.min(exp.pct, 100)}%` } as any} />
                                                    <span className="tabular-nums z-10 font-bold text-neutral-600">{formatPct(exp.pct)}</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    <TableRow className="border-y border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900">
                                        <TableCell className="pl-8 py-3 font-bold text-neutral-900 dark:text-white text-sm">TOTAL GASTOS (SALIDAS)</TableCell>
                                        <TableCell className="py-2 px-4 h-[40px]">
                                            <div className="h-full w-24 mx-auto opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={financialData.chartData}>
                                                        <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={false} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums font-bold text-red-600 dark:text-red-400 text-sm">{formatCurrency(financialData.totalExpenses)}</TableCell>
                                        <TableCell className="text-right pr-8 tabular-nums font-bold text-red-600 dark:text-red-400 text-sm">{formatPct((financialData.totalExpenses / (financialData.revenue.total || 1)) * 100)}</TableCell>
                                    </TableRow>

                                    {/* NET PROFIT SECTION */}
                                    <TableRow className="h-8 border-none hover:bg-transparent"><TableCell colSpan={4} /></TableRow>

                                    <TableRow className={`sticky bottom-0 z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] border-t-2 ${financialData.netProfit >= 0 ? 'border-emerald-500/30 bg-emerald-50/95 backdrop-blur-sm dark:bg-emerald-900/95' : 'border-red-500/30 bg-red-50/95 backdrop-blur-sm dark:bg-red-900/95'}`}>
                                        <TableCell className="pl-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 mb-1">Resultado Final</span>
                                                <div className="flex items-center gap-2 font-black text-lg text-neutral-800 dark:text-white">
                                                    {financialData.netProfit >= 0 ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-red-500" />}
                                                    Beneficio Operativo
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-6">
                                            <div className="h-12 w-32 mx-auto">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={financialData.chartData}>
                                                        <defs>
                                                            <linearGradient id="sparkProfit" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor={financialData.netProfit >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.3} />
                                                                <stop offset="95%" stopColor={financialData.netProfit >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <Area type="monotone" dataKey="profit" stroke={financialData.netProfit >= 0 ? "#10b981" : "#ef4444"} fill="url(#sparkProfit)" strokeWidth={2} />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </TableCell>
                                        <TableCell className={`text-right tabular-nums font-black text-xl py-6 ${financialData.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {formatCurrency(financialData.netProfit)}
                                        </TableCell>
                                        <TableCell className="text-right pr-8 py-6">
                                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${financialData.netProfit >= 0 ? 'bg-emerald-100/50 text-emerald-700 border-emerald-200' : 'bg-red-100/50 text-red-700 border-red-200'}`}>
                                                {formatPct(financialData.netProfitMargin)} MARGEN
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
