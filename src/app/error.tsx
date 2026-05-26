'use client'

import { useEffect } from 'react'

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
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-4xl font-bold text-red-500 dark:bg-red-900/20">
                !
            </div>

            <h2 className="text-2xl font-serif font-bold text-center mb-2">
                Algo salió mal
            </h2>

            <p className="text-muted-foreground text-center max-w-md mb-8">
                Hemos encontrado un error inesperado al cargar el dashboard.
                Nuestro equipo ha sido notificado.
            </p>

            <div className="flex gap-4">
                <button
                    type="button"
                    onClick={() => window.location.href = '/'}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                >
                    Ir al Inicio
                </button>
                <button
                    type="button"
                    onClick={() => reset()}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                >
                    Reintentar
                </button>
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
