'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (error) throw error

            toast.success("Login exitoso")
            router.push('/')
            router.refresh()

        } catch (error: unknown) {
            toast.error("Error al iniciar sesión", {
                description: error instanceof Error ? error.message : "Error desconocido"
            })
        } finally {
            setLoading(false)
        }
    }

    const handleSignUp = async () => {
        setLoading(true)
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password
            })

            if (error) throw error

            toast.success("Registro completado", {
                description: "Revisa tu email si tienes confirmación activada, o inicia sesión."
            })

        } catch (error: unknown) {
            toast.error("Error al registrarse", {
                description: error instanceof Error ? error.message : "Error desconocido"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <Card className="w-[350px]">
                <CardHeader>
                    <CardTitle>Control Hub</CardTitle>
                    <CardDescription>Inicia sesión o regístrate para continuar.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin}>
                        <div className="grid w-full items-center gap-4">
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    placeholder="tu@email.com"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="password">Contraseña</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 mt-4">
                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? "Cargando..." : "Iniciar Sesión"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    <div className="text-sm text-center text-muted-foreground">
                        ¿No tienes cuenta?
                    </div>
                    <Button variant="outline" onClick={handleSignUp} disabled={loading} className="w-full">
                        Crear Cuenta
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
