'use client'

import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

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
                    <div className="inline-flex p-4 bg-red-50 dark:bg-red-900/20 rounded-full text-red-500 mb-2">
                        <AlertTriangle className="w-16 h-16" />
                    </div>

                    <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100">
                        Error Crítico del Sistema
                    </h1>

                    <p className="text-slate-600 dark:text-slate-400">
                        Ha ocurrido un error irrecuperable en la aplicación.
                        Por favor, recarga la página completamente.
                    </p>

                    <Button onClick={() => reset()} size="lg" className="w-full">
                        Recargar Aplicación
                    </Button>
                </div>
            </body>
        </html>
    )
}
