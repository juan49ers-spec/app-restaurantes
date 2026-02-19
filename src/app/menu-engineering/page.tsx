import { getMenuReports } from "@/app/actions/menu-engineering"
import { MenuReport } from "@/types/schema"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { PlusCircle, ArrowRight, BarChart3, AlertTriangle } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function MenuEngineeringPage() {
    let reports: MenuReport[] = []
    let error: Error | null = null

    try {
        reports = await getMenuReports()
    } catch (e: unknown) {
        console.error("Error fetching menu reports:", e)
        error = e instanceof Error ? e : new Error(String(e))
    }

    if (error) {
        return (
            <div className="container mx-auto py-8">
                <Card className="border-red-500 bg-red-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-700">
                            <AlertTriangle className="h-5 w-5" />
                            Error al cargar informes
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-red-600">
                        <p>Ocurrió un error inesperado:</p>
                        <pre className="mt-2 text-xs bg-white p-4 rounded border border-red-200 overflow-auto">
                            {error.message || JSON.stringify(error)}
                        </pre>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8 max-w-5xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Ingeniería de Menú</h1>
                    <p className="text-slate-500 mt-1">
                        Analiza la rentabilidad y popularidad de tus platos para tomar decisiones estratégicas.
                    </p>
                </div>
                <Link href="/menu-engineering/new">
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nuevo Análisis
                    </Button>
                </Link>
            </div>

            {reports.length === 0 ? (
                <Card className="bg-slate-50 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                            <BarChart3 className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No hay informes todavía</h3>
                        <p className="text-slate-500 max-w-sm mb-6">
                            Crea tu primer análisis para clasificar tus platos en Estrellas, Vacas, Enigmas y Perros.
                        </p>
                        <Link href="/menu-engineering/new">
                            <Button>Comenzar Análisis</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {reports.map((report: MenuReport) => (
                        <Card key={report.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <Badge variant={report.status === 'ANALYZED' ? 'default' : 'secondary'}>
                                        {report.status === 'ANALYZED' ? 'Completado' : 'Borrador'}
                                    </Badge>
                                    <span className="text-xs text-slate-400">
                                        {report.created_at ? new Date(report.created_at).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                                <CardTitle className="mt-2">{report.name}</CardTitle>
                                <CardDescription>
                                    {report.date_from && report.date_to ? (
                                        `${new Date(report.date_from).toLocaleDateString()} - ${new Date(report.date_to).toLocaleDateString()}`
                                    ) : "Sin periodo definido"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {report.status === 'ANALYZED' && (
                                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                        <div>
                                            <p className="text-slate-500 text-xs">Margen Medio</p>
                                            <p className="font-semibold">€{Number(report.avg_margin).toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs">Popularidad</p>
                                            <p className="font-semibold">{Number(report.avg_popularity).toFixed(1)}%</p>
                                        </div>
                                    </div>
                                )}
                                <Link href={`/menu-engineering/${report.id}`}>
                                    <Button variant="outline" className="w-full group">
                                        Ver Informe
                                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
