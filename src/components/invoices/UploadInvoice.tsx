'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { UploadCloud, Coins, AlertCircle } from "lucide-react"
import { createInvoiceRecord } from "@/app/actions/invoices"
import { getCredits } from "@/app/actions/billing"
import { toast } from "sonner"
import { supabase } from "@/lib/supabaseClient"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function UploadInvoice() {
    const [isUploading, setIsUploading] = useState(false)
    const [credits, setCredits] = useState<number | null>(null)
    const [loadingCredits, setLoadingCredits] = useState(true)

    useEffect(() => {
        loadCredits()
    }, [])

    async function loadCredits() {
        try {
            const c = await getCredits()
            setCredits(c)
        } catch (e) {
            console.error(e)
        } finally {
            setLoadingCredits(false)
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        if (credits !== null && credits <= 0) {
            toast.error("Sin créditos", {
                description: "No tienes créditos OCR para procesar facturas."
            })
            return
        }

        const file = e.target.files[0]
        setIsUploading(true)

        try {
            // 1. Upload to Supabase Storage
            const fileName = `${Date.now()}-${file.name}`
            const { data, error } = await supabase.storage
                .from('invoices')
                .upload(fileName, file)

            if (error) throw error

            // 2. Create Record in DB & Trigger OCR
            const result = await createInvoiceRecord(data.path)

            if (!result.success) {
                throw new Error(result.error)
            }

            toast.success("Factura subida", {
                description: "El proceso de OCR ha comenzado. Se ha descontado 1 crédito."
            })

            // Reload credits to reflect deduction
            loadCredits()

        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Error desconocido"
            toast.error("Error al procesar", {
                description: message
            })
        } finally {
            setIsUploading(false)
        }
    }


    const hasCredits = credits !== null && credits > 0

    return (
        <Card className="border-dashed border-2 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="flex flex-col items-center justify-center py-10 gap-4">

                {/* Credit Status Badge */}
                <div className={`
                    flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border
                    ${loadingCredits ? 'bg-slate-100 text-slate-500 border-slate-200' :
                        hasCredits ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}
                `}>
                    <Coins className="h-3.5 w-3.5" />
                    <span>
                        {loadingCredits ? "..." : `${credits} Créditos OCR`}
                    </span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                    <UploadCloud className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                </div>

                <div className="text-center">
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-white">Subir Factura</h3>
                    <p className="text-sm text-slate-500">PDF o Imagen (Max 5MB)</p>
                </div>

                {!loadingCredits && !hasCredits && (
                    <Alert variant="destructive" className="max-w-xs p-3">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Sin créditos</AlertTitle>
                        <AlertDescription>
                            Has agotado tu saldo de escaneo IA.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="relative mt-2">
                    <Button
                        disabled={isUploading || (!loadingCredits && !hasCredits)}
                        variant={!loadingCredits && !hasCredits ? "secondary" : "default"}
                    >
                        {isUploading ? "Procesando..." : "Seleccionar Archivo"}
                    </Button>
                    <input
                        id="invoice-upload"
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        disabled={isUploading || (!loadingCredits && !hasCredits)}
                        title="Subir archivo de factura"
                    />
                </div>
            </CardContent>
        </Card>
    )
}
