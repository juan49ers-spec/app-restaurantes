'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

interface FileUploadStatus {
    file: File
    status: 'pending' | 'uploading' | 'processing' | 'success' | 'error'
    progress: number
    error?: string
    invoiceId?: string
}

export function InvoiceUpload() {
    const [files, setFiles] = useState<FileUploadStatus[]>([])

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newFiles = acceptedFiles.map(file => ({
            file,
            status: 'pending' as const,
            progress: 0
        }))
        setFiles(prev => [...prev, ...newFiles])
        
        // Process each file
        newFiles.forEach((fileStatus, index) => {
            processFile(fileStatus, files.length + index)
        })
    }, [files.length])

    const processFile = async (fileStatus: FileUploadStatus, index: number) => {
        setFiles(prev => {
            const updated = [...prev]
            updated[index] = { ...fileStatus, status: 'uploading', progress: 10 }
            return updated
        })

        const formData = new FormData()
        formData.append('file', fileStatus.file)

        try {
            // Upload
            setFiles(prev => {
                const updated = [...prev]
                updated[index] = { ...updated[index], progress: 30 }
                return updated
            })

            const response = await fetch('/api/invoices/upload', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) throw new Error('Upload failed')

            setFiles(prev => {
                const updated = [...prev]
                updated[index] = { ...updated[index], status: 'processing', progress: 70 }
                return updated
            })

            const result = await response.json()

            if (result.success) {
                setFiles(prev => {
                    const updated = [...prev]
                    updated[index] = { 
                        ...updated[index], 
                        status: 'success', 
                        progress: 100,
                        invoiceId: result.invoiceId
                    }
                    return updated
                })
                toast.success(`${fileStatus.file.name} procesado correctamente`)
            } else {
                throw new Error(result.error || 'Processing failed')
            }

        } catch (error) {
            setFiles(prev => {
                const updated = [...prev]
                updated[index] = { 
                    ...updated[index], 
                    status: 'error', 
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
                return updated
            })
            toast.error(`Error procesando ${fileStatus.file.name}`)
        }
    }

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'application/pdf': ['.pdf']
        },
        multiple: true
    })

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    return (
        <div className="space-y-6">
            {/* Dropzone */}
            <div
                {...getRootProps()}
                className={`
                    border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
                    transition-all duration-200
                    ${isDragActive 
                        ? 'border-emerald-500 bg-emerald-50 scale-[1.02]' 
                        : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
                    }
                `}
            >
                <input {...getInputProps()} />
                <Upload className={`mx-auto h-16 w-16 mb-4 ${isDragActive ? 'text-emerald-500' : 'text-slate-400'}`} />
                <p className="text-xl font-semibold text-slate-700 mb-2">
                    {isDragActive ? 'Suelta tus facturas aquí' : 'Arrastra facturas aquí'}
                </p>
                <p className="text-sm text-slate-500 mb-4">
                    PDF, PNG, JPG (máx. 10MB por archivo)
                </p>
                <Button type="button" variant="outline" className="pointer-events-none">
                    O selecciona archivos
                </Button>
            </div>

            {/* File List */}
            {files.length > 0 && (
                <div className="space-y-3">
                    <h3 className="font-semibold text-slate-700">Archivos ({files.length})</h3>
                    {files.map((fileStatus, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200"
                        >
                            <FileText className="h-8 w-8 text-slate-400 flex-shrink-0" />
                            
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-700 truncate">
                                    {fileStatus.file.name}
                                </p>
                                <p className="text-sm text-slate-500">
                                    {(fileStatus.file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                                
                                {fileStatus.status !== 'pending' && (
                                    <Progress value={fileStatus.progress} className="mt-2 h-2" />
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                {fileStatus.status === 'success' && (
                                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                                )}
                                {fileStatus.status === 'error' && (
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                )}
                                
                                {fileStatus.status === 'success' && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => window.location.href = `/invoices/${fileStatus.invoiceId}/review`}
                                    >
                                        Revisar
                                    </Button>
                                )}
                                
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeFile(index)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Batch Actions */}
            {files.some(f => f.status === 'success') && (
                <div className="flex gap-3">
                    <Button className="flex-1">
                        Aprobar Todas ({files.filter(f => f.status === 'success').length})
                    </Button>
                    <Button variant="outline" className="flex-1">
                        Exportar a Excel
                    </Button>
                </div>
            )}
        </div>
    )
}
