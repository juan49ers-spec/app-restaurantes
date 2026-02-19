"use client"

import { useState, useEffect } from "react"
import { motion, useSpring, useTransform } from "framer-motion"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { calculateMatrix, deleteReport } from "@/app/actions/menu-engineering"
import { SalesInputGrid } from "@/components/menu-engineering/SalesInputGrid"
import { InsightStrip } from "@/components/menu-engineering/InsightStrip"
import { MenuEngineeringProvider, useMenuEngineering, SimulatedMenuItem } from "@/components/menu-engineering/MenuEngineeringContext"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Calculator, Trash2, ArrowLeft, ChefHat } from "lucide-react"
import Link from "next/link"

// Lazy Load Heavy Components
const EngineeringMatrix = dynamic(() => import("@/components/menu-engineering/EngineeringMatrix").then(mod => mod.EngineeringMatrix), {
    loading: () => <Skeleton className="w-full h-[500px] rounded-xl" />,
    ssr: false // Recharts is client-side only
})

const StrategyCards = dynamic(() => import("@/components/menu-engineering/StrategyCards").then(mod => mod.StrategyCards), {
    loading: () => <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
    </div>
})

const AIChefLab = dynamic(() => import("@/components/menu-engineering/AIChefLab"), {
    loading: () => <Skeleton className="w-full h-[600px] rounded-xl" />
})
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { MenuReport } from "@/types/schema"

interface MenuEngineeringReport extends MenuReport {
    items: SimulatedMenuItem[]
}

interface Props {
    report: MenuEngineeringReport
}


function CountUp({ value, prefix = "", suffix = "", decimals = 0 }: { value: number, prefix?: string, suffix?: string, decimals?: number }) {
    const spring = useSpring(0, { bounce: 0, duration: 2000 })
    const display = useTransform(spring, (current) => `${prefix}${current.toFixed(decimals)}${suffix}`)

    useEffect(() => {
        spring.set(value)
    }, [value, spring])

    return <motion.span>{display}</motion.span>
}

export default function MenuEngineeringReportPage({ report }: Props) {
    // Transform items to ensure price/cost are populated for simulation
    const initialItems = (report.items || []).map(item => ({
        ...item,
        price: item.price !== undefined ? item.price : item.price_per_unit,
        cost: item.cost !== undefined ? item.cost : item.cost_per_unit,
        name: item.name || item.recipe?.name || 'Receta'
    })) as SimulatedMenuItem[]

    return (
        <MenuEngineeringProvider
            key={report.id}
            initialItems={initialItems}
            initialAvgPopularity={Number(report.avg_popularity || 0)}
            initialAvgMargin={Number(report.avg_margin || 0)}
            reportId={report.id || ""}
            reportName={report.name || ""}
        >
            <DashboardContent report={report} />
        </MenuEngineeringProvider>
    )
}

function DashboardContent({ report }: { report: MenuEngineeringReport }) {
    const router = useRouter()
    const { simulatedItems, simulatedAvgPopularity, simulatedAvgMargin, isSimulationMode, setIsSimulationMode } = useMenuEngineering()
    const [isCalculating, setIsCalculating] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Fallback to report data if simulation not ready (first render)
    const itemsToRender = simulatedItems.length > 0 ? simulatedItems : report.items
    const avgPopToRender = simulatedItems.length > 0 ? simulatedAvgPopularity : report.avg_popularity
    const avgMarginToRender = simulatedItems.length > 0 ? simulatedAvgMargin : report.avg_margin

    const handleCalculate = async () => {
        setIsCalculating(true)
        try {
            const res = await calculateMatrix({ reportId: report.id })
            if (res.success) {
                toast.success("Análisis completado", { description: "La matriz ha sido calculada." })
                router.refresh()
            } else {
                toast.error("Error", { description: res.error })
            }
        } catch {
            toast.error("Error", { description: "Fallo al calcular" })
        } finally {
            setIsCalculating(false)
        }
    }

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const res = await deleteReport({ id: report.id })
            if (res.success) {
                toast.success("Informe eliminado")
                router.push('/menu-engineering')
            } else {
                toast.error("Error", { description: res.error })
                setIsDeleting(false)
            }
        } catch {
            toast.error("Error", { description: "Fallo al eliminar" })
            setIsDeleting(false)
        }
    }

    return (
        <div className={`space-y-6 relative transition-all duration-500 ${isSimulationMode ? 'p-2 ring-4 ring-indigo-500/20 rounded-xl bg-indigo-50/10' : ''}`}>
            <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40"></div>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Link href="/menu-engineering">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            {report.name}
                            <Badge variant={report.status === 'ANALYZED' ? 'default' : 'secondary'}>
                                {report.status === 'ANALYZED' ? 'Completado' : 'Borrador'}
                            </Badge>
                            {isSimulationMode && (
                                <Badge variant="default" className="bg-indigo-600 animate-pulse">
                                    ⚡ MODO SIMULACIÓN
                                </Badge>
                            )}
                        </h1>
                        <p className="text-slate-500 text-sm">
                            {report.date_from ? new Date(report.date_from).toLocaleDateString() : 'N/A'} - {report.date_to ? new Date(report.date_to).toLocaleDateString() : 'N/A'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {report.status === 'ANALYZED' && (
                        <Button
                            variant={isSimulationMode ? "default" : "outline"}
                            onClick={() => setIsSimulationMode(!isSimulationMode)}
                            className={isSimulationMode ? "bg-indigo-600 hover:bg-indigo-700" : "border-indigo-200 text-indigo-700 hover:bg-indigo-50"}
                        >
                            {isSimulationMode ? "Salir de Simulación" : "⚡ Simulador What-If"}
                        </Button>
                    )}

                    {report.status === 'DRAFT' && (
                        <Button onClick={handleCalculate} disabled={isCalculating}>
                            {isCalculating ? "Calculando..." : (
                                <>
                                    <Calculator className="mr-2 h-4 w-4" />
                                    Calcular Matriz
                                </>
                            )}
                        </Button>
                    )}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" disabled={isDeleting}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Se eliminará el informe y todos sus datos asociados.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                                    Eliminar
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            {report.status === 'DRAFT' ? (
                <div className="space-y-4">
                    <Card className="bg-amber-50 border-amber-200">
                        <CardContent className="p-4 flex items-start gap-3 text-amber-800">
                            <div className="h-5 w-5 mt-0.5 flex-shrink-0">⚠️</div>
                            <div>
                                <h3 className="font-semibold">Instrucciones</h3>
                                <p className="text-sm">
                                    Introduce la cantidad vendida de cada plato para el periodo seleccionado.
                                    Una vez completado, pulsa &quot;Calcular Matriz&quot; para obtener la clasificación.
                                    Si algún coste o precio ha cambiado, puedes ajustarlo en su receta correspondiente.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <SalesInputGrid items={report.items} reportId={report.id || ""} />
                </div>
            ) : (
                <Tabs defaultValue="matrix" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
                        <TabsTrigger value="matrix">Dashboard de Ingeniería</TabsTrigger>
                        <TabsTrigger value="chef" className="gap-2">
                            <ChefHat className="w-4 h-4" />
                            Consultor Chef IA
                        </TabsTrigger>
                        <TabsTrigger value="data">Datos Detallados</TabsTrigger>
                    </TabsList>

                    <TabsContent value="matrix" className="space-y-8 mt-6">

                        {/* AI Insight Strip */}
                        <InsightStrip
                            items={itemsToRender}
                        />

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-slate-500">Popularidad Media</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold flex items-baseline gap-1">
                                        <CountUp value={Number(avgPopToRender) * 100} suffix="%" decimals={1} />
                                    </div>
                                    <p className="text-xs text-slate-400">Umbral de clasificación</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-slate-500">Margen Medio</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold flex items-baseline gap-1">
                                        <CountUp value={Number(avgMarginToRender)} prefix="€" decimals={2} />
                                    </div>
                                    <p className="text-xs text-slate-400">Contribución media ponderada</p>
                                </CardContent>
                            </Card>
                        </div>

                        <EngineeringMatrix
                            items={itemsToRender}
                            avgPopularity={Number(avgPopToRender)}
                            avgMargin={Number(avgMarginToRender)}
                        />

                        <StrategyCards items={itemsToRender} />
                    </TabsContent>

                    <TabsContent value="chef" className="mt-6">
                        <AIChefLab />
                    </TabsContent>

                    <TabsContent value="data" className="mt-6">
                        <SalesInputGrid items={itemsToRender} reportId={report.id || ""} isAnalyzed={true} />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    )
}
