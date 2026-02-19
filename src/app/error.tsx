'use client'

import { useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCcw } from "lucide-react"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an observability service
        console.error(error)
    }, [error])

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-500">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full text-red-500 mb-6">
                <AlertCircle className="w-12 h-12" />
            </div>

            <h2 className="text-2xl font-serif font-bold text-center mb-2">
                Algo salió mal
            </h2>

            <p className="text-muted-foreground text-center max-w-md mb-8">
                Hemos encontrado un error inesperado al cargar el dashboard.
                Nuestro equipo ha sido notificado.
            </p>

            <div className="flex gap-4">
                <Button
                    variant="outline"
                    onClick={() => window.location.href = '/'}
                >
                    Ir al Inicio
                </Button>
                <Button
                    onClick={() => reset()}
                    className="gap-2"
                >
                    <RefreshCcw className="w-4 h-4" />
                    Reintentar
                </Button>
            </div>

            {process.env.NODE_ENV === 'development' && (
                <pre className="mt-8 p-4 bg-slate-950 text-red-400 rounded-lg text-xs max-w-2xl overflow-auto w-full border border-red-900/50">
                    {error.message}
                    {'\n'}
                    {error.stack}
                </pre>
            )}
        </div>
    )
}
