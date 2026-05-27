"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { buildImportIssuesHref } from "@/lib/importing/import-issues-csv"

type ImportPreview = {
  fileErrors: string[]
  duplicates: { key: string; rowNumbers: number[] }[]
  rows: { rowNumber: number; status: string; errors: string[] }[]
}

export function ImportIssuesDownloadButton({
  preview,
  filename,
}: {
  preview: ImportPreview
  filename: string
}) {
  const issueCount = preview.fileErrors.length +
    preview.duplicates.length +
    preview.rows.filter(row => row.status === "invalid").length

  if (issueCount === 0) return null

  return (
    <Button asChild variant="outline" size="sm" className="w-full">
      <a href={buildImportIssuesHref(preview)} download={filename}>
        <Download className="size-3.5" />
        Descargar incidencias
      </a>
    </Button>
  )
}
