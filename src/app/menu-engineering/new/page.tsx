"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createMenuReport } from "@/app/actions/menu-engineering"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function NewReportPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const [formData, setFormData] = useState({
        name: `Análisis ${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`,
        date_from: new Date().toISOString().split('T')[0], // Today
        date_to: new Date().toISOString().split('T')[0],   // Today
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const res = await createMenuReport(formData)
            if (res.success && res.data) {
                toast.success("Informe creado", { description: "Redirigiendo..." })
                router.push(`/menu-engineering/${res.data.id}`)
            } else {
                toast.error("Error", { description: res.error || "Algo salió mal" })
            }
        } catch (_err) {
            toast.error("Error", { description: "Error de conexión" })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="container mx-auto py-8 max-w-lg">
            <Card>
                <CardHeader>
                    <CardTitle>Nuevo Análisis de Rentabilidad</CardTitle>
                    <CardDescription>
                        Crea un nuevo informe para analizar tu menú. Se tomará una &quot;foto&quot; de los costes y precios actuales.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre del Informe</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="date_from">Desde</Label>
                                <Input
                                    id="date_from"
                                    type="date"
                                    value={formData.date_from}
                                    onChange={(e) => setFormData(prev => ({ ...prev, date_from: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="date_to">Hasta</Label>
                                <Input
                                    id="date_to"
                                    type="date"
                                    value={formData.date_to}
                                    onChange={(e) => setFormData(prev => ({ ...prev, date_to: e.target.value }))}
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando...
                                </>
                            ) : (
                                "Crear Informe e Iniciar"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
