
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error("Financial Control Error Boundary Caught:", error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 gap-4 p-4 text-center">
            <div className="bg-red-50 p-4 rounded-full">
                <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900">Algo salió mal</h2>
            <p className="text-muted-foreground max-w-md">
                No pudimos cargar los datos financieros. Puede que haya un problema de conexión o configuración.
            </p>
            <div className="text-xs font-mono bg-neutral-100 p-2 rounded text-red-600 max-w-lg break-all">
                {error.message || "Error desconocido"}
            </div>
            <Button onClick={() => reset()} variant="default">
                Intentar de nuevo
            </Button>
        </div>
    )
}
