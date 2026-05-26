'use client'

export default function GlobalError({
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html>
            <body className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="text-center space-y-6 max-w-md">
                    <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-4xl text-red-500 dark:bg-red-900/20">
                        !
                    </div>

                    <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100">
                        Error Crítico del Sistema
                    </h1>

                    <p className="text-slate-600 dark:text-slate-400">
                        Ha ocurrido un error irrecuperable en la aplicación.
                        Por favor, recarga la página completamente.
                    </p>

                    <button
                        type="button"
                        onClick={() => reset()}
                        className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                    >
                        Recargar Aplicación
                    </button>
                </div>
            </body>
        </html>
    )
}
