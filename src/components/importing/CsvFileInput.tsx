"use client"

import type { ChangeEvent } from "react"
import { useState } from "react"
import { Input } from "@/components/ui/input"

interface CsvFileInputProps {
  id: string
  label?: string
  maxBytes?: number
  onTextLoaded: (text: string) => void
}

const DEFAULT_MAX_CSV_BYTES = 1024 * 1024

export function CsvFileInput({
  id,
  label = "Archivo CSV",
  maxBytes = DEFAULT_MAX_CSV_BYTES,
  onTextLoaded,
}: CsvFileInputProps) {
  const [message, setMessage] = useState<string | null>(null)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!isCsvFile(file)) {
      setMessage("Selecciona un archivo .csv válido.")
      event.currentTarget.value = ""
      return
    }

    if (file.size > maxBytes) {
      setMessage(`El CSV supera ${formatBytes(maxBytes)}. Divide el archivo antes de importarlo.`)
      event.currentTarget.value = ""
      return
    }

    try {
      const text = await file.text()
      setMessage(`Archivo cargado: ${file.name}`)
      onTextLoaded(text)
    } catch {
      setMessage("No se pudo leer el archivo CSV.")
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </label>
      <Input id={id} type="file" accept=".csv,text/csv" onChange={handleFileChange} />
      {message && (
        <p className="text-[11px] leading-4 text-neutral-500 dark:text-neutral-400" role="status">
          {message}
        </p>
      )}
    </div>
  )
}

function isCsvFile(file: File) {
  const name = file.name.toLowerCase()
  return name.endsWith(".csv") || file.type === "text/csv" || file.type === "application/vnd.ms-excel"
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${Math.round(bytes / (1024 * 1024))} MB`
}
