"use client"

import { useMemo, useState, useTransition } from "react"
import { AlertTriangle, CheckCircle2, Download, FileText, Upload } from "lucide-react"
import { importFinancialCsv, validateFinancialCsvImport } from "@/app/actions/financial-control"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    FINANCIAL_CSV_TEMPLATES,
    parseFinancialCsvPreview,
    type FinancialCsvKind,
} from "@/lib/importing/financial-csv"
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

const KIND_OPTIONS: { value: FinancialCsvKind; label: string; description: string }[] = [
    { value: "sales", label: "Ventas", description: "daily_sales" },
    { value: "expenses", label: "Gastos", description: "operating_expenses" },
]

export function FinancialCsvImportPanel() {
    const [kind, setKind] = useState<FinancialCsvKind>("sales")
    const [csvText, setCsvText] = useState("")
    const [message, setMessage] = useState<ImportMessage | null>(null)
    const [preflight, setPreflight] = useState<PreflightState>({ status: "idle" })
    const [isCheckingPending, startCheckingTransition] = useTransition()
    const [isImportPending, startImportTransition] = useTransition()

    const preview = useMemo(() => {
        if (!csvText.trim()) return null
        return parseFinancialCsvPreview({ kind, csvText })
    }, [csvText, kind])

    const previewSignature = `${kind}:${csvText}`
    const isPreflightClean = preflight.status === "clean" && preflight.signature === previewSignature
    const isPreflightChecking = preflight.status === "checking" && preflight.signature === previewSignature
    const templateHref = buildTemplateHref(kind)

    const hasBlockingIssues = Boolean(
        !preview ||
        preview.validRows === 0 ||
        preview.fileErrors.length > 0 ||
        preview.invalidRows > 0 ||
        preview.duplicates.length > 0
    )

    function handleKindChange(nextKind: FinancialCsvKind) {
        setKind(nextKind)
        setMessage(null)
        setPreflight({ status: "idle" })
    }

    async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (!file) return

        setMessage(null)
        setPreflight({ status: "idle" })
        setCsvText(await file.text())
    }

    function handlePreflight() {
        if (hasBlockingIssues) return

        setMessage(null)
        setPreflight({ status: "checking", signature: previewSignature })
        startCheckingTransition(async () => {
            const result = await validateFinancialCsvImport({ kind, csvText })

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

    function handleConfirm() {
        if (hasBlockingIssues || !isPreflightClean) return

        setMessage(null)
        startImportTransition(async () => {
            const result = await importFinancialCsv({ kind, csvText })
            if (!result.success || !result.data) {
                setMessage({
                    tone: "error",
                    text: result.error ?? "No se pudo importar el CSV.",
                })
                return
            }

            const skippedText = result.data.skippedRows > 0
                ? ` ${result.data.skippedRows} duplicadas ya existían.`
                : ""

            setMessage({
                tone: "success",
                text: `Importación completada: ${result.data.importedRows} filas guardadas.${skippedText}`,
            })
            setPreflight({ status: "idle" })
        })
    }

    return (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-neutral-950">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                            <Upload className="size-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-neutral-950 dark:text-white">Importación CSV</h2>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                Preview local, comprobación en BD y validación final en servidor.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {KIND_OPTIONS.map(option => (
                            <Button
                                key={option.value}
                                type="button"
                                variant={kind === option.value ? "default" : "outline"}
                                size="sm"
                                aria-pressed={kind === option.value}
                                onClick={() => handleKindChange(option.value)}
                            >
                                {option.label}
                                <span className="text-[10px] opacity-70">{option.description}</span>
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="w-full max-w-sm space-y-2">
                    <label htmlFor="financial-csv-file" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        Archivo CSV
                    </label>
                    <Input id="financial-csv-file" type="file" accept=".csv,text/csv" onChange={handleFileChange} />
                    <Button asChild variant="outline" size="sm" className="w-full">
                        <a href={templateHref} download={kind === "sales" ? "plantilla-ventas.csv" : "plantilla-gastos.csv"}>
                            <Download className="size-3.5" />
                            {kind === "sales" ? "Descargar plantilla ventas" : "Descargar plantilla gastos"}
                        </a>
                    </Button>
                </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-2">
                    <label htmlFor="financial-csv-text" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        Contenido CSV
                    </label>
                    <Textarea
                        id="financial-csv-text"
                        value={csvText}
                        onChange={event => {
                            setCsvText(event.target.value)
                            setMessage(null)
                            setPreflight({ status: "idle" })
                        }}
                        placeholder={kind === "sales"
                            ? "date;revenue_total;total_covers"
                            : "expense_date;category;amount;description"}
                        className="min-h-40 resize-y font-mono text-xs"
                    />
                </div>

                <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-white/10 dark:bg-white/5">
                    <PreviewSummary kind={kind} preview={preview} />
                    <PreflightStatus state={preflight} signature={previewSignature} />

                    {message && (
                        <div
                            className={cn(
                                "rounded-lg border px-3 py-2 text-xs font-medium",
                                message.tone === "success"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                                    : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200"
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
                        onClick={handleConfirm}
                    >
                        {isImportPending ? "Importando..." : "Importar CSV"}
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
            <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-600 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-300">
                Comprobando duplicados en base de datos...
            </div>
        )
    }

    if (state.status === "clean") {
        return (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                Sin duplicados en base de datos.
            </div>
        )
    }

    if (state.status === "error") {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
                {state.message}
            </div>
        )
    }

    return (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
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

function PreviewSummary({
    kind,
    preview,
}: {
    kind: FinancialCsvKind
    preview: ReturnType<typeof parseFinancialCsvPreview> | null
}) {
    if (!preview) {
        return (
            <div className="flex items-start gap-3 text-sm text-neutral-500 dark:text-neutral-400">
                <FileText className="mt-0.5 size-4" />
                <p>Pega un CSV o selecciona un archivo para ver el preview antes de importar.</p>
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
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200">
                    <CheckCircle2 className="size-3" />
                    {preview.validRows} filas válidas
                </Badge>
                <Badge
                    variant={preview.invalidRows > 0 ? "destructive" : "secondary"}
                    className={preview.invalidRows === 0 ? "bg-neutral-200 text-neutral-700 hover:bg-neutral-200 dark:bg-white/10 dark:text-neutral-200" : undefined}
                >
                    {preview.invalidRows} errores
                </Badge>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-xs">
                <Metric label="Periodo" value={formatPeriod(preview.summary.dateFrom, preview.summary.dateTo)} />
                <Metric
                    label={kind === "sales" ? "Ventas" : "Gastos"}
                    value={formatMoney(kind === "sales" ? preview.summary.totalRevenue : preview.summary.totalExpenses)}
                />
            </dl>

            {blockingMessages.length > 0 && (
                <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                    <div className="flex items-center gap-2 font-semibold">
                        <AlertTriangle className="size-3.5" />
                        Revisión necesaria
                    </div>
                    <ul className="space-y-1">
                        {blockingMessages.slice(0, 4).map(message => (
                            <li key={message}>{message}</li>
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
        <div className="rounded-lg bg-white p-3 ring-1 ring-neutral-200 dark:bg-neutral-950 dark:ring-white/10">
            <dt className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</dt>
            <dd className="mt-1 font-semibold text-neutral-950 dark:text-white">{value}</dd>
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

function buildTemplateHref(kind: FinancialCsvKind) {
    return `data:text/csv;charset=utf-8,${encodeURIComponent(FINANCIAL_CSV_TEMPLATES[kind])}`
}
