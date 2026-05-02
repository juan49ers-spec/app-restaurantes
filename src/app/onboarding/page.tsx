'use client'

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function OnboardingPage() {
    const [name, setName] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) throw new Error("No user found")

            // Insert Restaurant
            const { error } = await supabase
                .from('restaurants')
                .insert({
                    name,
                    owner_id: user.id
                })

            if (error) throw error

            toast.success("¡Restaurante creado!")
            toast.success("¡Restaurante creado!")

            // Force refresh to clear server cache of "no restaurant"
            router.refresh()

            // Hard navigation to ensure middleware re-runs and context updates
            setTimeout(() => {
                router.push('/finance')
            }, 1000)

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Error desconocido"
            toast.error("Error al crear", {
                description: errorMessage
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <Card className="w-[400px]">
                <CardHeader>
                    <CardTitle>Bienvenido a Control Hub 👨‍🍳</CardTitle>
                    <CardDescription>
                        Para empezar, necesitamos configurar tu espacio de trabajo.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nombre de tu Restaurante</label>
                            <Input
                                placeholder="Ej: La Trattoria de Juan"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                        </div>
                        <Button className="w-full" disabled={loading}>
                            {loading ? "Configurando..." : "Crear Espacio de Trabajo"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
