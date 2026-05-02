'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface FileUploadStatus {
    file: File
    status: 'pending' | 'uploading' | 'processing' | 'success' | 'error'
    progress: number
    error?: string
    invoiceId?: string
    provider?: string
    confidence?: number
    preview?: string
}

interface InvoiceUploadProps {
    onInvoiceProcessed?: (invoiceId: string, data: any) => void
    maxFiles?: number
    maxSize?: number // in bytes
}

export function InvoiceUploadV2({ onInvoiceProcessed, maxFiles = 20, maxSize = 10 * 1024 * 1024 }: InvoiceUploadProps) {
    const router = useRouter()
    const [files, setFiles] = useState<FileUploadStatus[]>([])
    const [isProcessing, setIsProcessing] = useState(false)

    const onDrop = useCallback((acceptedFiles: File[]) => {
        console.log('[InvoiceUpload] Files dropped:', acceptedFiles.length)
        
        if (acceptedFiles.length + files.length > maxFiles) {
            toast.error(`Máximo ${maxFiles} archivos a la vez`)
            return
        }

        const newFiles = acceptedFiles.map(file => {
            // Create preview for images
            if (file.type.startsWith('image/')) {
                const reader = new FileReader()
                reader.onloadend = () => {
                    setFiles(prev => prev.map((f, i) => 
                        i === prev.length - acceptedFiles.length + acceptedFiles.indexOf(file)
                            ? { ...f, preview: reader.result as string }
                            : f
                    ))
                }
                reader.readAsDataURL(file)
            }

            return {
                file,
                status: 'pending' as const,
                progress: 0
            }
        })

        setFiles(prev => [...prev, ...newFiles])
        console.log('[InvoiceUpload] Total files:', files.length + newFiles.length)
        
        // Auto-start processing
        processFiles(newFiles.map((f, i) => ({ ...f, index: files.length + i })))
    }, [files.length, maxFiles])

    const processFiles = async (filesToProcess: Array<FileUploadStatus & { index: number }>) => {
        console.log('[InvoiceUpload] Processing files:', filesToProcess.length)
        setIsProcessing(true)

        for (const { index, file } of filesToProcess) {
            await processFile(index, file)
        }

        setIsProcessing(false)
    }

    const processFile = async (index: number, file: File) => {
        console.log(`[InvoiceUpload] Processing file ${index}:`, file.name)
        
        setFiles(prev => {
            const updated = [...prev]
            if (updated[index]) {
                updated[index] = { ...updated[index], status: 'uploading', progress: 10 }
            }
            return updated
        })

        const formData = new FormData()
        formData.append('file', file)

        try {
            console.log(`[InvoiceUpload] Uploading ${file.name}...`)
            
            // Upload + Process
            setFiles(prev => {
                const updated = [...prev]
                if (updated[index]) {
                    updated[index] = { ...updated[index], progress: 30, status: 'processing' }
                }
                return updated
            })

            const response = await fetch('/api/invoices/upload', {
                method: 'POST',
                body: formData,
                // Important: include credentials for cookies
                credentials: 'include'
            })

            console.log(`[InvoiceUpload] Response status:`, response.status)

            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Upload failed' }))
                console.error(`[InvoiceUpload] Error response:`, error)
                throw new Error(error.error || error.message || 'Upload failed')
            }

            const result = await response.json()
            console.log(`[InvoiceUpload] Success:`, result)

            if (result.success) {
                setFiles(prev => {
                    const updated = [...prev]
                    updated[index] = { 
                        ...updated[index], 
                        status: 'success', 
                        progress: 100,
                        invoiceId: result.invoiceId,
                        provider: result.provider,
                        confidence: result.confidence
                    }
                    return updated
                })

                toast.success(`${file.name} procesado`, {
                    description: `Confianza: ${Math.round((result.confidence || 0) * 100)}%`
                })

                onInvoiceProcessed?.(result.invoiceId, result.data)
            } else {
                throw new Error(result.error || 'Processing failed')
            }

        } catch (error) {
            console.error('[InvoiceUpload] Upload error:', error)
            setFiles(prev => {
                const updated = [...prev]
                updated[index] = { 
                    ...updated[index], 
                    status: 'error', 
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
                return updated
            })
            toast.error(`Error: ${file.name}`, {
                description: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    const clearAll = () => {
        setFiles([])
    }

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/webp': ['.webp'],
            'application/pdf': ['.pdf']
        },
        maxSize,
        multiple: true,
        disabled: isProcessing
    })

    const stats = {
        total: files.length,
        pending: files.filter(f => f.status === 'pending').length,
        processing: files.filter(f => f.status === 'processing').length,
        success: files.filter(f => f.status === 'success').length,
        error: files.filter(f => f.status === 'error').length
    }

    console.log('[InvoiceUpload] Current stats:', stats)

    return (
        <div className="space-y-6">
            {/* Dropzone */}
            <div
                {...getRootProps()}
                className={`
                    relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
                    transition-all duration-200 group
                    ${isDragActive 
                        ? 'border-emerald-500 bg-emerald-50 scale-[1.01]' 
                        : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
                    }
                    ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
                `}
            >
                <input {...getInputProps()} />
                
                <div className="flex flex-col items-center">
                    <div className={`
                        p-4 rounded-full mb-4 transition-all duration-200
                        ${isDragActive ? 'bg-emerald-500' : 'bg-slate-200 group-hover:bg-emerald-100'}
                    `}>
                        <Upload className={`h-8 w-8 ${isDragActive ? 'text-white' : 'text-slate-500 group-hover:text-emerald-600'}`} />
                    </div>
                    
                    <p className="text-xl font-semibold text-slate-700 mb-2">
                        {isDragActive ? '¡Suelta tus facturas aquí!' : 'Arrastra facturas o tickets'}
                    </p>
                    <p className="text-sm text-slate-500 mb-4">
                        PDF, PNG, JPG, WEBP (máx. {(maxSize / 1024 / 1024).toFixed(0)}MB)
                    </p>
                    
                    <div className="flex gap-3 items-center">
                        <Button type="button" variant="outline" className="pointer-events-none">
                            Seleccionar archivos
                        </Button>
                        <span className="text-xs text-slate-400">o arrastra aquí</span>
                    </div>

                    {/* Supported providers badges */}
                    <div className="mt-6 flex gap-2 flex-wrap justify-center">
                        <Badge variant="secondary" className="text-xs">Chandra OCR</Badge>
                        <Badge variant="secondary" className="text-xs">Gemini 2.0</Badge>
                        <Badge variant="secondary" className="text-xs">Claude 3.5</Badge>
                        <Badge variant="secondary" className="text-xs">Ollama</Badge>
                    </div>
                </div>
            </div>

            {/* Stats bar */}
            {files.length > 0 && (
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex gap-4 text-sm">
                                <span className="text-slate-600">Total: <strong>{stats.total}</strong></span>
                                {stats.success > 0 && <span className="text-emerald-600">✓ {stats.success}</span>}
                                {stats.error > 0 && <span className="text-red-600">✗ {stats.error}</span>}
                                {stats.processing > 0 && <span className="text-blue-600">⟳ {stats.processing}</span>}
                            </div>
                            
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearAll}
                                disabled={isProcessing}
                            >
                                Limpiar todos
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* File List */}
            {files.length > 0 && (
                <div className="space-y-3">
                    {files.map((fileStatus, index) => (
                        <Card key={index} className={`
                            transition-all duration-200
                            ${fileStatus.status === 'success' ? 'border-emerald-200 bg-emerald-50/30' : ''}
                            ${fileStatus.status === 'error' ? 'border-red-200 bg-red-50/30' : ''}
                        `}>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-4">
                                    {/* Thumbnail or icon */}
                                    {fileStatus.preview ? (
                                        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                                            <img
                                                src={fileStatus.preview}
                                                alt={fileStatus.file.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                            <FileText className="h-8 w-8 text-slate-400" />
                                        </div>
                                    )}
                                    
                                    {/* File info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between mb-1">
                                            <p className="font-medium text-slate-700 truncate">
                                                {fileStatus.file.name}
                                            </p>
                                            <Badge 
                                                variant={
                                                    fileStatus.status === 'success' ? 'default' :
                                                    fileStatus.status === 'error' ? 'destructive' :
                                                    'secondary'
                                                }
                                                className="ml-2 text-xs"
                                            >
                                                {fileStatus.status}
                                            </Badge>
                                        </div>
                                        
                                        <p className="text-sm text-slate-500 mb-2">
                                            {(fileStatus.file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                        
                                        {fileStatus.status !== 'pending' && fileStatus.status !== 'error' && (
                                            <Progress value={fileStatus.progress} className="h-1.5" />
                                        )}

                                        {fileStatus.status === 'success' && fileStatus.confidence !== undefined && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                Confianza: <strong>{Math.round(fileStatus.confidence * 100)}%</strong>
                                                {fileStatus.provider && ` • ${fileStatus.provider}`}
                                            </p>
                                        )}

                                        {fileStatus.status === 'error' && fileStatus.error && (
                                            <p className="text-xs text-red-600 mt-1">{fileStatus.error}</p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {fileStatus.status === 'processing' && (
                                            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                                        )}
                                        
                                        {fileStatus.status === 'success' && (
                                            <CheckCircle className="h-6 w-6 text-emerald-500" />
                                        )}
                                        
                                        {fileStatus.status === 'error' && (
                                            <AlertCircle className="h-6 w-6 text-red-500" />
                                        )}
                                        
                                        {fileStatus.status === 'success' && fileStatus.invoiceId && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => router.push(`/invoices/${fileStatus.invoiceId}/review`)}
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                Revisar
                                            </Button>
                                        )}
                                        
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => removeFile(index)}
                                            disabled={fileStatus.status === 'processing'}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Batch actions */}
            {stats.success > 0 && (
                <div className="flex gap-3">
                    <Button className="flex-1" size="lg">
                        Aprobar todas ({stats.success})
                    </Button>
                    <Button variant="outline" className="flex-1" size="lg">
                        Exportar Excel
                    </Button>
                </div>
            )}
        </div>
    )
}
