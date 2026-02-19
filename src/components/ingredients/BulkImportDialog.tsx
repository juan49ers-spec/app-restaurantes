'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Upload, FileSpreadsheet, AlertCircle, Check, X, Download } from 'lucide-react'
import { parseCSV, validateIngredientsData, type IngredientImportRow, type ImportValidationResult } from '@/lib/import-utils'
import { importIngredientsBulk } from '@/app/actions/ingredients'
import { toast } from 'sonner'

interface BulkImportDialogProps {
  onSuccess?: () => void
}

interface ImportResult {
  success: number
  errors: number
  summary?: {
    created: number
    updated: number
    reactivated: number
    total: number
  }
}

export function BulkImportDialog({ onSuccess }: BulkImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<IngredientImportRow[]>([])
  const [validation, setValidation] = useState<ImportValidationResult | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv'))) {
      processFile(droppedFile)
    } else {
      toast.error('Por favor, sube un archivo CSV válido')
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processFile(selectedFile)
    }
  }, [])

  const processFile = async (file: File) => {
    try {
      setFile(file)
      const text = await file.text()
      const data = parseCSV(text)
      setParsedData(data)

      const validationResult = validateIngredientsData(data)
      setValidation(validationResult)

      if (validationResult.errors.length > 0) {
        toast.warning(`Se encontraron ${validationResult.errors.length} errores en el archivo`)
      } else {
        toast.success(`Archivo válido: ${data.length} ingredientes listos para importar`)
      }
    } catch (error) {
      toast.error('Error al procesar el archivo')
      console.error(error)
    }
  }

  const handleImport = async () => {
    if (!validation || validation.invalidRows.length > 0) {
      toast.error('Corrige los errores antes de importar')
      return
    }

    setIsImporting(true)
    setImportProgress(0)

    try {
      // Importar en lotes de 10
      const batchSize = 10
      const validRows = validation.validRows
      const stats = {
        created: 0,
        updated: 0,
        reactivated: 0,
        errors: 0,
        total: 0
      }

      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize)

        try {
          const result = await importIngredientsBulk(batch)
          if (result.success && result.summary) {
            stats.created += result.summary.created
            stats.updated += result.summary.updated
            stats.reactivated += result.summary.reactivated
            stats.total += result.summary.total
          } else {
            // Fallback for types or older version
            stats.total += batch.length
          }
        } catch (error) {
          console.error('Error en lote:', error)
          stats.errors += batch.length
        }

        const progress = Math.round(((i + batch.length) / validRows.length) * 100)
        setImportProgress(progress)
      }

      setImportResult({ success: stats.total, errors: stats.errors, summary: stats })

      if (stats.errors === 0) {
        toast.success(`¡Proceso completado! ${stats.created} creados, ${stats.updated} actualizados.`)
        onSuccess?.()
      } else {
        toast.warning(`Importación parcial: ${stats.total} procesados, ${stats.errors} errores`)
      }
    } catch (error) {
      toast.error('Error durante la importación')
      console.error(error)
    } finally {
      setIsImporting(false)
    }
  }

  const downloadTemplate = () => {
    const template = `nombre,unidad_base,categoria,merma_pct,precio,alergenos
Tomate Pera,kg,Verduras,10,2.50,
Cebolla,kg,Verduras,15,1.80,
Pechuga Pollo,kg,Carnes,5,8.90,
Aceite Oliva,l,Despensa,0,12.00,
Sal Marina,kg,Despensa,0,1.20,
Leche Entera,l,Lacteos,0,1.10,lacteos
Harina Trigo,kg,Despensa,0,0.85,gluten
Huevos Medianos,u,Huevos,0,3.20,huevos`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla_ingredientes.csv'
    a.click()
    window.URL.revokeObjectURL(url)

    toast.success('Plantilla descargada')
  }

  const resetState = () => {
    setFile(null)
    setParsedData([])
    setValidation(null)
    setImportProgress(0)
    setImportResult(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) resetState()
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar CSV
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Importar Ingredientes Masivamente
          </DialogTitle>
          <DialogDescription>
            Sube un archivo CSV con tus ingredientes. Descarga la plantilla para ver el formato correcto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template */}
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={downloadTemplate} className="gap-2">
              <Download className="h-4 w-4" />
              Descargar plantilla
            </Button>
          </div>

          {/* Drop Zone */}
          {!file && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center transition-colors
                ${isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
                }
              `}
            >
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-2">
                Arrastra tu archivo CSV aquí o haz clic para seleccionar
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Formatos soportados: .csv (máx. 5MB)
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload">
                <Button variant="secondary" size="sm" className="cursor-pointer" asChild>
                  <span>Seleccionar archivo</span>
                </Button>
              </label>
            </div>
          )}

          {/* File Info */}
          {file && !importResult && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {parsedData.length} filas detectadas
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={resetState}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Validation Results */}
          {validation && validation.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Se encontraron {validation.errors.length} errores. Corrígelos antes de importar.
              </AlertDescription>
            </Alert>
          )}

          {/* Data Preview */}
          {parsedData.length > 0 && !importResult && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b flex items-center justify-between">
                <span className="text-sm font-medium">Vista previa</span>
                {validation && (
                  <div className="flex gap-2">
                    <Badge variant="default" className="text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      {validation.validRows.length} válidos
                    </Badge>
                    {validation.invalidRows.length > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        <X className="h-3 w-3 mr-1" />
                        {validation.invalidRows.length} con errores
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="max-h-64 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Merma</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 10).map((row, index) => {
                      const rowError = validation?.errors.find((e: { row: number }) => e.row === index)

                      return (
                        <TableRow key={index} className={rowError ? 'bg-destructive/5' : ''}>
                          <TableCell className="text-xs text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-medium">{row.nombre}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs uppercase">
                              {row.unidad_base}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {row.categoria || '-'}
                          </TableCell>
                          <TableCell>{row.merma_pct}%</TableCell>
                          <TableCell>€{row.precio}</TableCell>
                          <TableCell>
                            {rowError ? (
                              <Tooltip content={rowError.message}>
                                <Badge variant="destructive" className="text-xs cursor-help">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Error
                                </Badge>
                              </Tooltip>
                            ) : (
                              <Badge variant="default" className="text-xs bg-green-600">
                                <Check className="h-3 w-3 mr-1" />
                                OK
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                {parsedData.length > 10 && (
                  <div className="text-center py-2 text-xs text-muted-foreground border-t">
                    ... y {parsedData.length - 10} filas más
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Import Progress */}
          {isImporting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Importando...</span>
                <span>{importProgress}%</span>
              </div>
              <Progress value={importProgress} />
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="space-y-4">
              <Alert className={importResult.errors === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}>
                <AlertDescription className="space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    {importResult.errors === 0 ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    )}
                    <span className={importResult.errors === 0 ? "text-green-800" : "text-yellow-800"}>
                      {importResult.errors === 0 ? 'Importación completada con éxito' : 'Importación completada con advertencias'}
                    </span>
                  </div>

                  {importResult.summary && (
                    <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
                      <div className="bg-green-100/50 p-2 rounded text-center">
                        <div className="font-bold text-green-700">{importResult.summary.created}</div>
                        <div className="text-xs text-green-600">Creados</div>
                      </div>
                      <div className="bg-blue-100/50 p-2 rounded text-center">
                        <div className="font-bold text-blue-700">{importResult.summary.updated}</div>
                        <div className="text-xs text-blue-600">Actualizados</div>
                      </div>
                      <div className="bg-amber-100/50 p-2 rounded text-center">
                        <div className="font-bold text-amber-700">{importResult.summary.reactivated}</div>
                        <div className="text-xs text-amber-600">Reactivados</div>
                      </div>
                      <div className="bg-red-100/50 p-2 rounded text-center">
                        <div className="font-bold text-red-700">{importResult.errors}</div>
                        <div className="text-xs text-red-600">Fallidos</div>
                      </div>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {!importResult && (
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
            )}

            {file && !importResult && (
              <Button
                onClick={handleImport}
                disabled={isImporting || !validation || validation.invalidRows.length > 0}
              >
                {isImporting ? 'Importando...' : `Importar ${validation?.validRows.length || 0} ingredientes`}
              </Button>
            )}

            {importResult && (
              <Button onClick={() => { setIsOpen(false); onSuccess?.(); }}>
                Finalizar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}



// Import Tooltip component inline since we're using a custom one
import { Tooltip } from '@/components/ui/Tooltip'
