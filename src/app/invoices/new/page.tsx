'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { InvoiceUploadV2 } from '@/components/invoices/InvoiceUploadV2'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, FileText, Zap, Shield, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function NewInvoicePage() {
    const router = useRouter()
    const [processedCount, setProcessedCount] = useState(0)

    const handleInvoiceProcessed = (invoiceId: string, data: any) => {
        setProcessedCount(prev => prev + 1)
        // Opcional: mostrar notificación o actualizar estado
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
            {/* Header */}
            <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/invoices">
                                <Button variant="ghost" size="sm">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Volver a Facturas
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">
                                    Subir Facturas
                                </h1>
                                <p className="text-sm text-slate-500">
                                    OCR inteligente con múltiples proveedores
                                </p>
                            </div>
                        </div>

                        {processedCount > 0 && (
                            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg">
                                <CheckCircle2 className="h-5 w-5" />
                                <span className="font-medium">{processedCount} procesadas</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Upload Area */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Upload Component */}
                        <Card className="border-2 border-slate-200 shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-6 w-6 text-emerald-600" />
                                    Arrastra tus facturas aquí
                                </CardTitle>
                                <CardDescription>
                                    Soporta PDF, JPEG, PNG, WEBP (máx. 10MB por archivo)
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <InvoiceUploadV2 
                                    onInvoiceProcessed={handleInvoiceProcessed}
                                    maxFiles={20}
                                    maxSize={10 * 1024 * 1024}
                                />
                            </CardContent>
                        </Card>

                        {/* Quick Tips */}
                        <Card className="bg-blue-50 border-blue-200">
                            <CardHeader>
                                <CardTitle className="text-lg text-blue-900">
                                    💡 Consejos para mejores resultados
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-blue-800 space-y-2">
                                <p>• <strong>Iluminación:</strong> Buena luz, sin sombras</p>
                                <p>• <strong>Enfoque:</strong> Imagen nítida, texto legible</p>
                                <p>• <strong>Formato:</strong> Preferiblemente PDF original o foto en alta resolución</p>
                                <p>• <strong>Contenido:</strong> Asegúrate de que se vean todos los datos importantes</p>
                                <p>• <strong>Múltiples:</strong> Puedes subir hasta 20 facturas a la vez</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Info & Features */}
                    <div className="space-y-6">
                        {/* OCR Providers */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-emerald-600" />
                                    Motores OCR Activos
                                </CardTitle>
                                <CardDescription>
                                    Sistema con fallback automático
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <ProviderBadge 
                                    name="Chandra OCR"
                                    description="85.9% precisión - TOP del mercado"
                                    status="active"
                                    color="emerald"
                                />
                                <ProviderBadge 
                                    name="Gemini 2.0 Flash"
                                    description="Ultrarrápido - 1-2 segundos"
                                    status="active"
                                    color="blue"
                                />
                                <ProviderBadge 
                                    name="Claude 3.5 Haiku"
                                    description="Alta precisión - 2-3 segundos"
                                    status="active"
                                    color="purple"
                                />
                                <ProviderBadge 
                                    name="Ollama Local"
                                    description="Backup gratis - siempre disponible"
                                    status="standby"
                                    color="slate"
                                />
                            </CardContent>
                        </Card>

                        {/* Features */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-emerald-600" />
                                    Características
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-3">
                                <FeatureItem 
                                    icon="✓"
                                    title="Precisión 85.9%"
                                    description="Mejor benchmark del mercado"
                                />
                                <FeatureItem 
                                    icon="⚡"
                                    title="Procesamiento rápido"
                                    description="2-5 segundos por factura"
                                />
                                <FeatureItem 
                                    icon="🔒"
                                    title="100% Seguro"
                                    description="Datos encriptados y privados"
                                />
                                <FeatureItem 
                                    icon="🌍"
                                    title="Multilingual"
                                    description="Soporta 90+ idiomas"
                                />
                                <FeatureItem 
                                    icon="📊"
                                    title="Tablas complejas"
                                    description="Detecta layouts difíciles"
                                />
                                <FeatureItem 
                                    icon="✍️"
                                    title="Handwriting"
                                    description="Reconoce escritura manual"
                                />
                            </CardContent>
                        </Card>

                        {/* Pricing */}
                        <Card className="bg-gradient-to-br from-emerald-50 to-blue-50 border-emerald-200">
                            <CardHeader>
                                <CardTitle className="text-lg">💰 Costos</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-slate-700">Chandra (mejor):</span>
                                    <span className="font-semibold">~$0.02/factura</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-700">Gemini (rápido):</span>
                                    <span className="font-semibold">~$0.001/factura</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-700">Ollama (backup):</span>
                                    <span className="font-semibold">Gratis</span>
                                </div>
                                <hr className="my-2" />
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Estimado mensual:</span>
                                    <span className="text-emerald-600">$2-18</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    * Según volumen (100-1000 facturas/mes)
                                </p>
                            </CardContent>
                        </Card>

                        {/* CTA */}
                        <Card className="bg-slate-900 text-white">
                            <CardContent className="pt-6">
                                <div className="text-center space-y-4">
                                    <p className="text-lg font-semibold">
                                        ¿Necesitas ayuda?
                                    </p>
                                    <p className="text-sm text-slate-300">
                                        Revisa la guía de configuración completa
                                    </p>
                                    <Button 
                                        variant="outline" 
                                        className="w-full bg-white text-slate-900 hover:bg-slate-100"
                                        onClick={() => window.open('/OCR_SETUP.md', '_blank')}
                                    >
                                        📖 Ver Guía de Configuración
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Componentes auxiliares
function ProviderBadge({ 
    name, 
    description, 
    status, 
    color 
}: { 
    name: string
    description: string
    status: 'active' | 'standby'
    color: 'emerald' | 'blue' | 'purple' | 'slate'
}) {
    const colorClasses = {
        emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        blue: 'bg-blue-100 text-blue-800 border-blue-200',
        purple: 'bg-purple-100 text-purple-800 border-purple-200',
        slate: 'bg-slate-100 text-slate-800 border-slate-200'
    }

    return (
        <div className={`p-3 rounded-lg border ${colorClasses[color]} relative`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="font-semibold text-sm">{name}</p>
                    <p className="text-xs opacity-80 mt-1">{description}</p>
                </div>
                {status === 'active' && (
                    <div className="h-2 w-2 rounded-full bg-current animate-pulse" />
                )}
            </div>
        </div>
    )
}

function FeatureItem({ 
    icon, 
    title, 
    description 
}: { 
    icon: string
    title: string
    description: string
}) {
    return (
        <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">{icon}</span>
            <div>
                <p className="font-medium text-slate-900">{title}</p>
                <p className="text-xs text-slate-500">{description}</p>
            </div>
        </div>
    )
}
