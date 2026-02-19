'use client'

import { useState, useCallback } from 'react'
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { processInvoice } from '@/app/actions/invoices'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function InvoiceDropzone() {
    const [isDragging, setIsDragging] = useState(false)
    const [files, setFiles] = useState<File[]>([])
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState<{ [key: string]: string }>({}) // filename -> status

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true)
        } else if (e.type === 'dragleave') {
            setIsDragging(false)
        }
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const newFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/') || f.type === 'application/pdf')
            if (newFiles.length !== e.dataTransfer.files.length) {
                toast.warning("Solo se admiten imágenes y PDFs. Se han filtrado algunos archivos.")
            }
            setFiles(prev => [...prev, ...newFiles])
        }
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files)
            setFiles(prev => [...prev, ...newFiles])
        }
    }

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleUpload = async () => {
        setUploading(true)

        // Process sequentially to be safe, or parallel? 
        // Parallel might hit rate limits. Let's do parallel with limit 3? 
        // For simple MVP: Parallel is fine for small batches.

        const uploads = files.map(async (file) => {
            const fileKey = file.name
            setProgress(prev => ({ ...prev, [fileKey]: 'uploading' }))

            try {
                const formData = new FormData()
                formData.append('file', file)

                setProgress(prev => ({ ...prev, [fileKey]: 'analyzing' }))
                const result = await processInvoice(formData)

                if (result.success) {
                    setProgress(prev => ({ ...prev, [fileKey]: 'completed' }))
                } else {
                    setProgress(prev => ({ ...prev, [fileKey]: 'error' }))
                    toast.error(`Error en ${file.name}: ${result.error}`)
                }
            } catch (err) {
                setProgress(prev => ({ ...prev, [fileKey]: 'error' }))
                console.error(err)
            }
        })

        await Promise.all(uploads)
        setUploading(false)
        setFiles([]) // Clear queue after done? Or keep errors?
        // Ideally keep errors. For MVP clear and show toast.
        toast.success("Proceso completado")
        // Trigger refresh handled by server action? 
        // We might want to clear successfully uploaded ones.
    }

    return (
        <div className="w-full max-w-xl mx-auto space-y-4">
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={cn(
                    "relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 ease-in-out text-center cursor-pointer",
                    isDragging
                        ? "border-primary bg-primary/5 scale-[1.02]"
                        : "border-slate-200 hover:border-primary/50 hover:bg-slate-50",
                    files.length > 0 && "border-slate-200 bg-slate-50/50"
                )}
            >
                <input
                    type="file"
                    aria-label="Upload invoices"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={handleChange}
                    disabled={uploading}
                />

                <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                    <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center mb-2">
                        <Upload className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700">Arrastra tus facturas aquí</h3>
                    <p className="text-sm text-slate-500">soporta JPG, PNG, PDF</p>
                </div>
            </div>

            {files.length > 0 && (
                <div className="space-y-2">
                    {files.map((file, idx) => {
                        const status = progress[file.name]
                        return (
                            <div key={`${file.name}-${idx}`} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center">
                                        <FileText className="h-4 w-4 text-slate-500" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                                        <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {status === 'uploading' && <span className="text-xs text-blue-600 animate-pulse">Subiendo...</span>}
                                    {status === 'analyzing' && <span className="text-xs text-purple-600 animate-pulse font-medium">Analizando (IA)...</span>}
                                    {status === 'completed' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                                    {status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}

                                    {!status && !uploading && (
                                        <Button variant="ghost" size="icon" onClick={() => removeFile(idx)} className="h-8 w-8 text-slate-400 hover:text-red-500">
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )
                    })}

                    <div className="pt-2 flex justify-end">
                        <Button onClick={handleUpload} disabled={uploading}>
                            {uploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Procesando {files.length} archivos...
                                </>
                            ) : (
                                `Procesar ${files.length} Facturas`
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
