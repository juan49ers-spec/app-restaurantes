"use client"

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { HelpCircle, LayoutDashboard, Wallet, Brain, Users, Target, FileText, Receipt, ShieldCheck, AlertTriangle } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

export function DashboardGuide() {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-muted-foreground hover:text-foreground hidden md:flex">
                    <HelpCircle className="w-4 h-4" />
                    Guía de Uso
                </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[600px] md:w-[800px]">
                <SheetHeader className="mb-6">
                    <SheetTitle className="text-2xl font-serif">Manual de Operaciones ControlHub</SheetTitle>
                    <SheetDescription>
                        Documentación técnica de los módulos Estratégico (CEO) y Financiero (CFO).
                    </SheetDescription>
                </SheetHeader>

                <Tabs defaultValue="ceo" className="h-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="ceo">Visión CEO (Estrategia)</TabsTrigger>
                        <TabsTrigger value="cfo">Visión CFO (Control)</TabsTrigger>
                    </TabsList>

                    <ScrollArea className="h-[calc(100vh-200px)] pr-6">
                        {/* ════════════════════ VISION CEO ════════════════════ */}
                        <TabsContent value="ceo" className="space-y-8 mt-0">

                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                <h3 className="font-semibold flex items-center gap-2 mb-2 text-primary">
                                    <LayoutDashboard className="w-5 h-5" />
                                    Propósito: Diagnóstico en Tiempo Real
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Como dueño, no solo quieres saber {"\"cuánto\""} has ganado, sino {"\"por qué\""}. El Simulador de Beneficios te ayuda a proyectar cómo impactarían cambios en volumen o precios, mostrándote el margen necesario para cubrir tus gastos fijos.
                                </p>
                            </div>

                            <section>
                                <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <Brain className="w-5 h-5 text-indigo-500" />
                                    1. Smart Briefing & Pulse
                                </h4>
                                <div className="grid gap-4">
                                    <GuideCard
                                        title="KPIs Principales"
                                        description="Métricas financieras calculadas automáticamente."
                                    >
                                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
                                            <li><strong className="text-foreground">Ventas Totales:</strong> Facturación bruta (impuestos incluidos).</li>
                                            <li><strong className="text-foreground">Beneficio Neto:</strong> Ventas - (COGS + Personal + Fijos).</li>
                                            <li><strong className="text-foreground">Ticket Medio:</strong> Facturación / Nº Comensales (PAX).</li>
                                            <li><strong className="text-foreground">Food Cost:</strong> % de coste de materia prima sobre ventas.</li>
                                        </ul>
                                    </GuideCard>
                                </div>
                            </section>

                            <section>
                                <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <Target className="w-5 h-5 text-emerald-500" />
                                    2. Simulador de Beneficios
                                </h4>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Herramienta interactiva para proyectar escenarios {"\"Qué pasaría si...\""}.
                                </p>
                                <div className="border rounded-lg p-4 bg-background">
                                    <h5 className="font-medium text-sm mb-3">Variables Ajustables</h5>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="space-y-1">
                                            <span className="block font-medium text-indigo-600">Volumen Ventas</span>
                                            <span className="text-muted-foreground text-xs">Simula subidas/bajadas de tráfico.</span>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="block font-medium text-amber-600">Coste Producto (COGS)</span>
                                            <span className="text-muted-foreground text-xs">Impacto de renegociar con proveedores.</span>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="block font-medium text-blue-600">Coste Personal</span>
                                            <span className="text-muted-foreground text-xs">Optimización de plantilla.</span>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="block font-medium text-slate-600">Gastos Fijos</span>
                                            <span className="text-muted-foreground text-xs">Alquiler y suministros.</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-purple-500" />
                                    3. Inteligencia Operativa
                                </h4>
                                <div className="space-y-3">
                                    <GuideItem
                                        title="Matriz BCG (Ingeniería de Menú)"
                                        desc="Clasifica tus productos según Rentabilidad vs Popularidad (Estrellas, Vacas, Perros, Enigmas)."
                                    />
                                    <GuideItem
                                        title="Eficiencia de Staff"
                                        desc="Mide Venta/Hora de trabajo. Alerta si el coste laboral supera el 30% de las ventas."
                                    />
                                    <GuideItem
                                        title="Productos Fantasma"
                                        desc="Detecta ítems en carta que no se han vendido en el periodo seleccionado (Coste de oportunidad)."
                                    />
                                </div>
                            </section>
                        </TabsContent>

                        {/* ════════════════════ VISION CFO ════════════════════ */}
                        <TabsContent value="cfo" className="space-y-8 mt-0">

                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                <h3 className="font-semibold flex items-center gap-2 mb-2 text-emerald-700 dark:text-emerald-400">
                                    <Wallet className="w-5 h-5" />
                                    Propósito: Input y Control de Datos
                                </h3>
                                <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">
                                    El Dashboard de Control Hub es el {"\"cerebro\""} de tu gestión. Aquí verás de un vistazo la salud financiera de tu negocio y podrás tomar decisiones basadas en datos reales. Todos tus datos operativos están centralizados aquí.
                                </p>
                            </div>

                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold text-lg flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-slate-500" />
                                        1. Cierre de Caja (Diario)
                                    </h4>
                                    <Badge variant="outline">Obligatorio</Badge>
                                </div>

                                <CardTable
                                    headers={["Campo", "Descripción", "Validación"]}
                                    rows={[
                                        ["Sala / Barra €", "Facturación presencial", "Numérico (+)"],
                                        ["Take Away €", "Pedidos para llevar", "Numérico (+)"],
                                        ["Delivery €", "Plataformas (Uber/Glovo)", "Numérico (+)"],
                                        ["Nº Comensales (PAX)", "Personas totales atendidas", "Afecta al Ticket Medio"],
                                        ["Horas Equipo", "Total horas trabajadas (Sala+Cocina)", "Afecta a Productividad (Venta/Hora)"]
                                    ]}
                                />

                                <div className="mt-4 bg-amber-50 p-3 rounded-lg border border-amber-200">
                                    <h5 className="text-xs font-bold text-amber-800 flex items-center gap-1 mb-1">
                                        <AlertTriangle className="w-3 h-3" /> Sistema de Alertas
                                    </h5>
                                    <p className="text-xs text-amber-700">
                                        El sistema valida automáticamente la coherencia de los datos.
                                        Si el <strong>Ticket Medio &lt; 10€</strong> habiendo comensales, bloqueará o advertirá sobre un posible error en el conteo de PAX o facturación.
                                    </p>
                                </div>
                            </section>

                            <Separator />

                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold text-lg flex items-center gap-2">
                                        <Receipt className="w-5 h-5 text-orange-500" />
                                        2. Gestión de Gastos
                                    </h4>
                                    <Badge variant="outline">Recurrente</Badge>
                                </div>

                                <p className="text-sm text-muted-foreground mb-4">
                                    Registro de facturas recibidas. Es vital categorizar correctamente para tener un P&L real.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="border rounded-lg p-3">
                                        <h5 className="font-medium text-sm mb-2">Categorías Operativas (COGS)</h5>
                                        <ul className="text-xs space-y-1 text-muted-foreground">
                                            <li>• Compras Alimentos (Materia Prima)</li>
                                            <li>• Compras Bebidas (Alcohol/Refrescos)</li>
                                        </ul>
                                    </div>
                                    <div className="border rounded-lg p-3">
                                        <h5 className="font-medium text-sm mb-2">Categorías Estructurales</h5>
                                        <ul className="text-xs space-y-1 text-muted-foreground">
                                            <li>• Alquiler y Suministros</li>
                                            <li>• Personal (Nóminas y Seguros)</li>
                                            <li>• Reparaciones y Marketing</li>
                                        </ul>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-teal-500" />
                                    3. Auditoría y Bloqueo
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex gap-2">
                                        <span className="text-teal-500 font-bold">•</span>
                                        <span><strong>Estado {"\"Día Bloqueado\""}:</strong> Una vez guardado un cierre, se puede bloquear para evitar modificaciones accidentales.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-teal-500 font-bold">•</span>
                                        <span><strong>Trazabilidad:</strong> Se registra la fecha y hora de la última modificación de cada cierre.</span>
                                    </li>
                                </ul>
                            </section>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </SheetContent>
        </Sheet >
    )
}

function GuideCard({ title, description, children }: { title: string, description: string, children?: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 shadow-sm">
            <h5 className="font-semibold text-foreground mb-1">{title}</h5>
            <p className="text-sm text-muted-foreground">{description}</p>
            {children}
        </div>
    )
}

function GuideItem({ title, desc }: { title: string, desc: string }) {
    return (
        <div className="flex gap-3">
            <div className="min-w-1.5 w-1.5 h-1.5 rounded-full bg-primary mt-2" />
            <div>
                <strong className="block text-sm font-medium text-foreground">{title}</strong>
                <span className="text-sm text-muted-foreground">{desc}</span>
            </div>
        </div>
    )
}

function CardTable({ headers, rows }: { headers: string[], rows: string[][] }) {
    return (
        <div className="border rounded-lg overflow-hidden text-sm">
            <table className="w-full">
                <thead className="bg-muted/50">
                    <tr>
                        {headers.map((h, i) => (
                            <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground border-b">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-background">
                    {rows.map((row, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                            {row.map((cell, j) => (
                                <td key={j} className="px-3 py-2 text-foreground">{cell}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
