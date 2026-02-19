import { getInvoices } from "@/app/actions/invoices"
import { InvoiceDropzone } from "@/components/invoices/InvoiceDropzone"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle2, DollarSign, FileText, ScanText, TrendingUp } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default async function InvoicesPage() {
    const invoices = await getInvoices()

    const pendingReview = invoices.filter(i => i.status === 'review_required' || i.status === 'processing')
    const completed = invoices.filter(i => i.status === 'completed')

    // Quick Stats
    const totalSpend = completed.reduce((acc, curr) => acc + (curr.total_amount || 0), 0)
    const processedCount = completed.length
    const avgTicket = processedCount > 0 ? totalSpend / processedCount : 0

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <ScanText className="w-6 h-6 text-blue-600" />
                        Gestión de Facturas (IA)
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Sube tus facturas y deja que la Inteligencia Artificial extraiga los datos.</p>
                </div>
                <div className="flex gap-2">
                    {/* Future Actions */}
                </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Gastos Totales</p>
                            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalSpend.toFixed(2)} €</h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Facturas Procesadas</p>
                            <h3 className="text-2xl font-bold text-slate-900 mt-1">{processedCount}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ticket Medio</p>
                            <h3 className="text-2xl font-bold text-slate-900 mt-1">{avgTicket.toFixed(2)} €</h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-purple-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="upload" className="space-y-6">
                <TabsList className="bg-slate-100 p-1 rounded-lg w-full max-w-md grid grid-cols-3">
                    <TabsTrigger value="upload" className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">Subir</TabsTrigger>
                    <TabsTrigger value="review" className="relative data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm">
                        Revisión
                        {pendingReview.length > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white animate-bounce">
                                {pendingReview.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:shadow-sm">Histórico</TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                    <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
                        <CardHeader className="text-center">
                            <CardTitle className="text-lg font-medium text-slate-700">Ingesta Inteligente</CardTitle>
                            <CardDescription>
                                Arrastra tus facturas aquí (PDF, JPG, PNG).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-12 max-w-xl mx-auto w-full">
                            <InvoiceDropzone />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="review" className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                    <Card className="border-amber-100 bg-white shadow-sm">
                        <CardHeader className="bg-amber-50/30 border-b border-amber-100 pb-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-lg text-amber-900">Pendientes de Revisión</CardTitle>
                                    <CardDescription>Verifica los datos extraídos antes de guardar.</CardDescription>
                                </div>
                                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                                    {pendingReview.length} pendientes
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {pendingReview.length === 0 ? (
                                <div className="text-center py-16 text-slate-400 flex flex-col items-center">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                        <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
                                    </div>
                                    <p className="font-medium text-slate-600">Todo al día</p>
                                    <p className="text-sm">No hay facturas pendientes de revisión.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow>
                                            <TableHead className="w-[100px]">Estado</TableHead>
                                            <TableHead>Fecha Subida</TableHead>
                                            <TableHead>Proveedor (Detectado)</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead className="text-right">Acción</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingReview.map(invoice => (
                                            <TableRow key={invoice.id} className="hover:bg-amber-50/30 transition-colors">
                                                <TableCell>
                                                    <Badge variant={invoice.status === 'processing' ? 'secondary' : 'default'} className={`whitespace-nowrap ${invoice.status === 'review_required' ? 'bg-amber-500 hover:bg-amber-600 text-white border-0' : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-0'}`}>
                                                        {invoice.status === 'processing' ? 'Analizando...' : 'Revisar'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-slate-500 text-xs">
                                                    {invoice.created_at ? formatDistanceToNow(new Date(invoice.created_at), { addSuffix: true, locale: es }) : '-'}
                                                </TableCell>
                                                <TableCell className="font-medium text-slate-700">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarFallback className="text-[10px] bg-amber-100 text-amber-700">
                                                                {invoice.scanned_data?.supplier?.name?.substring(0, 2).toUpperCase() || "?"}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        {invoice.scanned_data?.supplier?.name || "Detectando..."}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-medium text-slate-900">
                                                    {invoice.scanned_data?.total_amount ? `€${invoice.scanned_data.total_amount.toFixed(2)}` : '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {invoice.status === 'review_required' && (
                                                        <Link href={`/invoices/${invoice.id}/review`}>
                                                            <Button size="sm" className="gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-sm h-8">
                                                                Revisar <ArrowRight className="h-3 w-3" />
                                                            </Button>
                                                        </Link>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history" className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                            <CardTitle className="text-lg text-slate-800">Histórico de Facturas</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead>Fecha Doc.</TableHead>
                                        <TableHead>Nº Factura</TableHead>
                                        <TableHead>Proveedor</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-center">Estado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {completed.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-slate-400">
                                                <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                                No hay facturas procesadas aún.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {completed.map(invoice => (
                                        <TableRow key={invoice.id} className="hover:bg-slate-50 transition-colors group">
                                            <TableCell className="text-xs text-slate-500">
                                                {invoice.date || '-'}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-slate-600 bg-slate-50 w-fit px-2 py-1 rounded border border-transparent group-hover:border-slate-200">
                                                {invoice.invoice_number || '-'}
                                            </TableCell>
                                            <TableCell className="font-medium text-slate-700">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarFallback className="text-[10px] bg-blue-50 text-blue-600">
                                                            {invoice.scanned_data?.supplier?.name?.substring(0, 2).toUpperCase() || "?"}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    {invoice.scanned_data?.supplier?.name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-slate-900">
                                                €{invoice.total_amount?.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50 px-2 py-0.5 h-6">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Completado
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
