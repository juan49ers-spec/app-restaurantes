'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { BarChart3, Eye, EyeOff, Loader2 } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
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
        <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0 bg-slate-50/50">
            {/* Lado Izquierdo: Branding & Imagen */}
            <div className="relative hidden h-full flex-col bg-slate-900 p-10 text-white dark:border-r lg:flex overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <Image
                        src="/login-bg.png"
                        alt="Restaurant Manager checking financials"
                        fill
                        sizes="50vw"
                        className="object-cover opacity-60 mix-blend-luminosity hover:scale-105 transition-transform duration-10000"
                        priority
                    />
                    {/* Gradiente sutil para legibilidad del texto */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-slate-900/10" />
                </div>

                <div className="relative z-20 flex items-center text-xl font-bold gap-2 cursor-default mb-auto">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/90 text-white shadow-lg shadow-emerald-500/20 backdrop-blur-sm">
                        <BarChart3 className="h-6 w-6" />
                    </div>
                    <span className="tracking-tight drop-shadow-sm">Control Hub</span>
                </div>

                <div className="relative z-20 mt-auto bg-slate-900/60 p-8 rounded-2xl backdrop-blur-md border border-white/10 shadow-2xl">
                    <blockquote className="space-y-4">
                        <p className="text-2xl font-medium leading-snug text-white drop-shadow-md">
                            &ldquo;Toma el control absoluto de las finanzas y la operativa de tu restaurante en tiempo real. Decisiones inteligentes basadas en datos limpios.&rdquo;
                        </p>
                        <footer className="text-sm font-medium text-emerald-400">Plataforma de Gestión Estratégica</footer>
                    </blockquote>
                </div>
            </div>

            {/* Lado Derecho: Formulario de Login */}
            <div className="lg:p-8 flex items-center justify-center h-full sm:min-h-screen lg:min-h-0 bg-white lg:bg-transparent">
                <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[420px] px-6 sm:px-10 lg:bg-white lg:p-10 lg:rounded-[2rem] lg:shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:border lg:border-slate-100">
                    <div className="flex flex-col space-y-2 text-center lg:text-left">
                        {/* Logo visible en mobile */}
                        <div className="flex justify-center lg:hidden mb-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                                <BarChart3 className="h-7 w-7" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Bienvenido</h1>
                        <p className="text-sm text-slate-500">
                            Ingresa tus credenciales para acceder a tu panel de control financiero.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-700 font-medium">Correo Electrónico</Label>
                            <Input
                                id="email"
                                placeholder="ejemplo@restaurante.com"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                required
                                className="h-12 px-4 shadow-sm border-slate-200 bg-slate-50/50 transition-all duration-200 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 focus-visible:bg-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-slate-700 font-medium">Contraseña</Label>
                                <a href="#" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                                    ¿Olvidaste tu contraseña?
                                </a>
                            </div>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    required
                                    className="h-12 px-4 pr-10 shadow-sm border-slate-200 bg-slate-50/50 transition-all duration-200 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 focus-visible:bg-white"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                                    disabled={loading}
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 text-[15px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all duration-200 flex items-center justify-center"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
                        </Button>
                    </form>

                    <div className="relative pt-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-100" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase font-medium tracking-wider">
                            <span className="bg-white px-3 text-slate-400">Acceso a nuevos usuarios</span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        type="button"
                        onClick={handleSignUp}
                        disabled={loading}
                        className="w-full h-12 text-[15px] font-medium border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200"
                    >
                        Crear nueva cuenta
                    </Button>

                    <p className="px-8 text-center text-sm text-slate-500 mt-2">
                        Al continuar, aceptas nuestros{" "}
                        <a href="#" className="underline underline-offset-4 hover:text-emerald-600 transition-colors">
                            Términos
                        </a>{" "}
                        y{" "}
                        <a href="#" className="underline underline-offset-4 hover:text-emerald-600 transition-colors">
                            Privacidad
                        </a>.
                    </p>
                </div>
            </div>
        </div>
    )
}
