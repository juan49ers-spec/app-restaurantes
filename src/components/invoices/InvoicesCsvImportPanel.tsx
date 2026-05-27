"use client"

import { useMemo, useState, useTransition } from "react"
import { AlertTriangle, CheckCircle2, Download, FileText, Upload } from "lucide-react"
import { importInvoicesCsv, validateInvoicesCsvImport } from "@/app/actions/invoices"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ImportIssuesDownloadButton } from "@/components/importing/ImportIssuesDownloadButton"
import { INVOICES_CSV_TEMPLATE, parseInvoicesCsvPreview } from "@/lib/importing/invoices-csv"
import { cn } from "@/lib/utils"

type ImportMessage = {
    tone: "success" | "error"
    text: string
}

type ExistingImportRow = {
    key: string
    rowNumbers: number[]
    message: string
}

type PreflightState =
    | { status: "idle" }
    | { status: "checking"; signature: string }
    | { status: "clean"; signature: string }
    | { status: "blocked"; signature: string; existingRows: ExistingImportRow[] }
    | { status: "error"; signature: string; message: string }

export function InvoicesCsvImportPanel() {
    const [csvText, setCsvText] = useState("")
    const [message, setMessage] = useState<ImportMessage | null>(null)
    const [preflight, setPreflight] = useState<PreflightState>({ status: "idle" })
    const [isCheckingPending, startCheckingTransition] = useTransition()
    const [isImportPending, startImportTransition] = useTransition()

    const preview = useMemo(() => {
        if (!csvText.trim()) return null
        return parseInvoicesCsvPreview({ csvText })
    }, [csvText])

    const previewSignature = csvText
    const isPreflightClean = preflight.status === "clean" && preflight.signature === previewSignature
    const isPreflightChecking = preflight.status === "checking" && preflight.signature === previewSignature
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
        setPreflight({ status: "checking", signature: previewSignature })
        startCheckingTransition(async () => {
            const result = await validateInvoicesCsvImport({ csvText })

            if (!result.success || !result.data) {
                setPreflight({
                    status: "error",
                    signature: previewSignature,
                    message: result.error ?? "No se pudo comprobar el CSV contra la base de datos.",
                })
                return
            }

            setPreflight(result.data.canImport
                ? { status: "clean", signature: previewSignature }
                : {
                    status: "blocked",
                    signature: previewSignature,
                    existingRows: result.data.existingRows,
                })
        })
    }

    function handleImport() {
        if (hasBlockingIssues || !isPreflightClean) return

        setMessage(null)
        startImportTransition(async () => {
            const result = await importInvoicesCsv({ csvText })
            if (!result.success || !result.data) {
                setMessage({
                    tone: "error",
                    text: result.error ?? "No se pudieron importar las facturas.",
                })
                return
            }

            setMessage({
                tone: "success",
                text: `Importación completada: ${result.data.importedRows} facturas guardadas.`,
            })
            setPreflight({ status: "idle" })
        })
    }

    return (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Upload className="size-4" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-neutral-950">Importar cabeceras CSV</h2>
                        <p className="text-xs text-neutral-500">
                            Añade histórico de facturas ya revisadas. No genera stock, líneas ni gasto automático.
                        </p>
                    </div>
                </div>

                <Button asChild variant="outline" size="sm">
                    <a href={buildTemplateHref()} download="plantilla-facturas.csv">
                        <Download className="size-3.5" />
                        Descargar plantilla
                    </a>
                </Button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-2">
                    <label htmlFor="invoices-csv-text" className="text-xs font-medium text-neutral-700">
                        CSV facturas
                    </label>
                    <Textarea
                        id="invoices-csv-text"
                        value={csvText}
                        onChange={event => {
                            setCsvText(event.target.value)
                            setMessage(null)
                            setPreflight({ status: "idle" })
                        }}
                        placeholder="date;supplier_name;invoice_number;total_amount;tax_amount"
                        className="min-h-32 resize-y font-mono text-xs"
                    />
                </div>

                <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <PreviewSummary preview={preview} />
                    {preview && <ImportIssuesDownloadButton preview={preview} filename="incidencias-facturas.csv" />}
                    <PreflightStatus state={preflight} signature={previewSignature} />

                    {message && (
                        <div
                            className={cn(
                                "rounded-lg border px-3 py-2 text-xs font-medium",
                                message.tone === "success"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-red-200 bg-red-50 text-red-700"
                            )}
                        >
                            {message.text}
                        </div>
                    )}

                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={hasBlockingIssues || isCheckingPending || isImportPending}
                        onClick={handlePreflight}
                    >
                        {isPreflightChecking ? "Comprobando..." : "Comprobar duplicados"}
                    </Button>

                    <Button
                        type="button"
                        className="w-full"
                        disabled={hasBlockingIssues || isCheckingPending || isImportPending || !isPreflightClean}
                        onClick={handleImport}
                    >
                        {isImportPending ? "Importando..." : "Importar facturas"}
                    </Button>
                </div>
            </div>
        </section>
    )
}

function PreflightStatus({ state, signature }: { state: PreflightState; signature: string }) {
    if (state.status === "idle" || state.signature !== signature) return null

    if (state.status === "checking") {
        return (
            <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-600">
                Comprobando duplicados en base de datos...
            </div>
        )
    }

    if (state.status === "clean") {
        return (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                Sin duplicados en base de datos.
            </div>
        )
    }

    if (state.status === "error") {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {state.message}
            </div>
        )
    }

    return (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="size-3.5" />
                Duplicados en base de datos
            </div>
            <ul className="space-y-1">
                {state.existingRows.slice(0, 4).map(row => (
                    <li key={`${row.key}-${row.rowNumbers.join("-")}`}>{row.message}</li>
                ))}
            </ul>
            {state.existingRows.length > 4 && (
                <p>{state.existingRows.length - 4} duplicados más.</p>
            )}
        </div>
    )
}

function PreviewSummary({ preview }: { preview: ReturnType<typeof parseInvoicesCsvPreview> | null }) {
    if (!preview) {
        return (
            <div className="flex items-start gap-3 text-sm text-neutral-500">
                <FileText className="mt-0.5 size-4" />
                <p>Pega un CSV para validar proveedores, fechas, números e importes.</p>
            </div>
        )
    }

    const blockingMessages = [
        ...preview.fileErrors,
        ...preview.duplicates.map(duplicate =>
            `Duplicado interno ${duplicate.key} en filas ${duplicate.rowNumbers.join(", ")}.`
        ),
        ...preview.rows
            .filter(row => row.status === "invalid")
            .flatMap(row => row.errors.map(error => `Fila ${row.rowNumber}: ${error}`)),
    ]

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                    <CheckCircle2 className="size-3" />
                    {preview.validRows} facturas válidas
                </Badge>
                <Badge
                    variant={preview.invalidRows > 0 ? "destructive" : "secondary"}
                    className={preview.invalidRows === 0 ? "bg-neutral-200 text-neutral-700 hover:bg-neutral-200" : undefined}
                >
                    {preview.invalidRows} errores
                </Badge>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-xs">
                <Metric label="Periodo" value={formatPeriod(preview.summary.dateFrom, preview.summary.dateTo)} />
                <Metric label="Total" value={formatMoney(preview.summary.totalAmount)} />
                <Metric label="IVA" value={formatMoney(preview.summary.taxAmount)} />
                <Metric label="Proveedores" value={String(preview.summary.supplierRefs)} />
            </dl>

            {blockingMessages.length > 0 && (
                <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    <div className="flex items-center gap-2 font-semibold">
                        <AlertTriangle className="size-3.5" />
                        Revisión necesaria
                    </div>
                    <ul className="space-y-1">
                        {blockingMessages.slice(0, 4).map((message, index) => (
                            <li key={`${index}-${message}`}>{message}</li>
                        ))}
                    </ul>
                    {blockingMessages.length > 4 && (
                        <p>{blockingMessages.length - 4} incidencias más.</p>
                    )}
                </div>
            )}
        </div>
    )
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg bg-white p-3 ring-1 ring-neutral-200">
            <dt className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</dt>
            <dd className="mt-1 font-semibold text-neutral-950">{value}</dd>
        </div>
    )
}

function formatPeriod(from: string | null, to: string | null) {
    if (!from || !to) return "Sin fechas"
    return from === to ? from : `${from} · ${to}`
}

function formatMoney(value: number) {
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value).replace(/\s/g, " ")
}

function buildTemplateHref() {
    return `data:text/csv;charset=utf-8,${encodeURIComponent(INVOICES_CSV_TEMPLATE)}`
}
