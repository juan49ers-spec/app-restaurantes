"use client"

import { useMemo, useState, useTransition } from "react"
import { AlertTriangle, CheckCircle2, Download, FileText, Upload } from "lucide-react"
import { importRecipesCsv, validateRecipesCsvImport } from "@/app/actions/recipes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ImportIssuesDownloadButton } from "@/components/importing/ImportIssuesDownloadButton"
import { parseRecipesCsvPreview, RECIPES_CSV_TEMPLATE } from "@/lib/importing/recipes-csv"
import { cn } from "@/lib/utils"

type ExistingImportRow = { key: string; rowNumbers: number[]; message: string }
type PreflightState =
  | { status: "idle" }
  | { status: "checking"; signature: string }
  | { status: "clean"; signature: string }
  | { status: "blocked"; signature: string; existingRows: ExistingImportRow[] }
  | { status: "error"; signature: string; message: string }

export function RecipesCsvImportPanel() {
  const [csvText, setCsvText] = useState("")
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null)
  const [preflight, setPreflight] = useState<PreflightState>({ status: "idle" })
  const [isCheckingPending, startCheckingTransition] = useTransition()
  const [isImportPending, startImportTransition] = useTransition()

  const preview = useMemo(() => {
    if (!csvText.trim()) return null
    return parseRecipesCsvPreview({ csvText })
  }, [csvText])

  const signature = csvText
  const isPreflightClean = preflight.status === "clean" && preflight.signature === signature
  const hasBlockingIssues = Boolean(
    !preview ||
    preview.validRows === 0 ||
    preview.fileErrors.length > 0 ||
    preview.invalidRows > 0 ||
    preview.duplicates.length > 0
  )

  function handlePreflight() {
    if (hasBlockingIssues) return
    setMessage(null)
    setPreflight({ status: "checking", signature })
    startCheckingTransition(async () => {
      const result = await validateRecipesCsvImport({ csvText })
      if (!result.success || !result.data) {
        setPreflight({ status: "error", signature, message: result.error ?? "No se pudo comprobar el CSV." })
        return
      }
      setPreflight(result.data.canImport
        ? { status: "clean", signature }
        : { status: "blocked", signature, existingRows: result.data.existingRows })
    })
  }

  function handleImport() {
    if (hasBlockingIssues || !isPreflightClean) return
    setMessage(null)
    startImportTransition(async () => {
      const result = await importRecipesCsv({ csvText })
      if (!result.success || !result.data) {
        setMessage({ tone: "error", text: result.error ?? "No se pudieron importar las recetas." })
        return
      }
      setMessage({ tone: "success", text: `Importación completada: ${result.data.importedRows} recetas guardadas.` })
      setPreflight({ status: "idle" })
    })
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Upload className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-950">Importar recetas CSV</h2>
            <p className="text-xs text-neutral-500">Carga cabeceras de carta con precio y coste. No crea ingredientes ni descuenta stock.</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={templateHref()} download="plantilla-recetas.csv">
            <Download className="size-3.5" />
            Descargar plantilla
          </a>
        </Button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-2">
          <label htmlFor="recipes-csv-text" className="text-xs font-medium text-neutral-700">CSV recetas</label>
          <Textarea
            id="recipes-csv-text"
            value={csvText}
            onChange={event => {
              setCsvText(event.target.value)
              setMessage(null)
              setPreflight({ status: "idle" })
            }}
            placeholder="name;selling_price;current_cost"
            className="min-h-32 resize-y font-mono text-xs"
          />
        </div>
        <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <PreviewSummary preview={preview} />
          {preview && <ImportIssuesDownloadButton preview={preview} filename="incidencias-recetas.csv" />}
          <PreflightStatus state={preflight} signature={signature} />
          {message && <MessageBox message={message} />}
          <Button type="button" variant="outline" className="w-full" disabled={hasBlockingIssues || isCheckingPending || isImportPending} onClick={handlePreflight}>
            {isCheckingPending ? "Comprobando..." : "Comprobar duplicados"}
          </Button>
          <Button type="button" className="w-full" disabled={hasBlockingIssues || isCheckingPending || isImportPending || !isPreflightClean} onClick={handleImport}>
            {isImportPending ? "Importando..." : "Importar recetas"}
          </Button>
        </div>
      </div>
    </section>
  )
}

function PreviewSummary({ preview }: { preview: ReturnType<typeof parseRecipesCsvPreview> | null }) {
  if (!preview) {
    return <div className="flex items-start gap-3 text-sm text-neutral-500"><FileText className="mt-0.5 size-4" /><p>Pega un CSV para validar recetas, precios y costes.</p></div>
  }
  const blockingMessages = [
    ...preview.fileErrors,
    ...preview.duplicates.map(duplicate => `Duplicado interno ${duplicate.key} en filas ${duplicate.rowNumbers.join(", ")}.`),
    ...preview.rows.filter(row => row.status === "invalid").flatMap(row => row.errors.map(error => `Fila ${row.rowNumber}: ${error}`)),
  ]
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100"><CheckCircle2 className="size-3" />{preview.validRows} recetas válidas</Badge>
        <Badge variant={preview.invalidRows > 0 ? "destructive" : "secondary"}>{preview.invalidRows} errores</Badge>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-xs">
        <Metric label="Precio medio" value={formatMoney(preview.summary.avgSellingPrice)} />
        <Metric label="Coste medio" value={formatMoney(preview.summary.avgCurrentCost)} />
      </dl>
      {blockingMessages.length > 0 && <Issues messages={blockingMessages} />}
    </div>
  )
}

function PreflightStatus({ state, signature }: { state: PreflightState; signature: string }) {
  if (state.status === "idle" || state.signature !== signature) return null
  if (state.status === "checking") return <Status tone="neutral" text="Comprobando duplicados..." />
  if (state.status === "clean") return <Status tone="success" text="Sin duplicados en recetas." />
  if (state.status === "error") return <Status tone="error" text={state.message} />
  return <Issues title="Duplicados en base de datos" messages={state.existingRows.map(row => row.message)} />
}

function Issues({ messages, title = "Revisión necesaria" }: { messages: string[]; title?: string }) {
  return (
    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
      <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-3.5" />{title}</div>
      {messages.slice(0, 4).map((message, index) => <p key={`${index}-${message}`}>{message}</p>)}
      {messages.length > 4 && <p>{messages.length - 4} incidencias más.</p>}
    </div>
  )
}

function MessageBox({ message }: { message: { tone: "success" | "error"; text: string } }) {
  return <div className={cn("rounded-lg border px-3 py-2 text-xs font-medium", message.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700")}>{message.text}</div>
}

function Status({ tone, text }: { tone: "neutral" | "success" | "error"; text: string }) {
  return <div className={cn("rounded-lg border px-3 py-2 text-xs font-medium", tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700", tone === "error" && "border-red-200 bg-red-50 text-red-700", tone === "neutral" && "border-neutral-200 bg-white text-neutral-600")}>{text}</div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-white p-3 ring-1 ring-neutral-200"><dt className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</dt><dd className="mt-1 font-semibold text-neutral-950">{value}</dd></div>
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value).replace(/\s/g, " ")
}

function templateHref() {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(RECIPES_CSV_TEMPLATE)}`
}
