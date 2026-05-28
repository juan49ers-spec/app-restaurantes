"use client"

import type { ChangeEvent } from "react"
import { Input } from "@/components/ui/input"

interface CsvFileInputProps {
  id: string
  label?: string
  onTextLoaded: (text: string) => void
}

export function CsvFileInput({
  id,
  label = "Archivo CSV",
  onTextLoaded,
}: CsvFileInputProps) {
  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    onTextLoaded(await file.text())
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </label>
      <Input id={id} type="file" accept=".csv,text/csv" onChange={handleFileChange} />
    </div>
  )
}
