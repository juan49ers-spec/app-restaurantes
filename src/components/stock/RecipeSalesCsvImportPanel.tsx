"use client"

import { useMemo, useState, useTransition } from "react"
import { AlertTriangle, CheckCircle2, Download, FileText, Upload } from "lucide-react"
import { importRecipeSalesCsv, validateRecipeSalesCsvImport } from "@/app/actions/stock-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    parseRecipeSalesCsvPreview,
    RECIPE_SALES_CSV_TEMPLATE,
} from "@/lib/importing/recipe-sales-csv"
import { cn } from "@/lib/utils"

type PreflightState =
    | { status: "idle" }
    | { status: "checking"; signature: string }
    | { status: "clean"; signature: string }
    | { status: "blocked"; signature: string; existingRows: { key: string; message: string }[] }
    | { status: "error"; signature: string; message: string }

export function RecipeSalesCsvImportPanel() {
    const [csvText, setCsvText] = useState("")
    const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null)
    const [preflight, setPreflight] = useState<PreflightState>({ status: "idle" })
    const [isCheckingPending, startCheckingTransition] = useTransition()
    const [isImportPending, startImportTransition] = useTransition()

    const preview = useMemo(() => {
        if (!csvText.trim()) return null
        return parseRecipeSalesCsvPreview({ csvText })
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
            const result = await validateRecipeSalesCsvImport({ csvText })
            if (!result.success || !result.data) {
                setPreflight({
                    status: "error",
                    signature,
                    message: result.error ?? "No se pudo comprobar el CSV.",
                })
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
            const result = await importRecipeSalesCsv({ csvText })
            if (!result.success || !result.data) {
                setMessage({ tone: "error", text: result.error ?? "No se pudo importar el CSV." })
                return
            }

            setMessage({
                tone: "success",
                text: `Importación completada: ${result.data.importedRows} filas guardadas.`,
            })
            setPreflight({ status: "idle" })
        })
    }

    return (
        <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <Upload className="size-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-neutral-950">Importar ventas por receta</h3>
                        <p className="text-xs text-neutral-500">Carga cantidades para informes y Menu Engineering. No descuenta stock.</p>
                    </div>
                </div>
                <Button asChild variant="outline" size="sm">
                    <a href={templateHref()} download="plantilla-ventas-receta.csv">
                        <Download className="size-3.5" />
                        Descargar plantilla
                    </a>
                </Button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-2">
                    <label htmlFor="recipe-sales-csv" className="text-xs font-medium text-neutral-700">
                        CSV ventas por receta
                    </label>
                    <Textarea
                        id="recipe-sales-csv"
                        value={csvText}
                        onChange={event => {
                            setCsvText(event.target.value)
                            setMessage(null)
                            setPreflight({ status: "idle" })
                        }}
                        placeholder="date;recipe_name;quantity_sold"
                        className="min-h-32 resize-y font-mono text-xs"
                    />
                </div>

                <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <RecipeSalesPreview preview={preview} />
                    <PreflightStatus state={preflight} signature={signature} />
                    {message && (
                        <div
                            className={cn(
                                "rounded-md border px-3 py-2 text-xs font-medium",
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
                        {isCheckingPending ? "Comprobando..." : "Comprobar duplicados"}
                    </Button>
                    <Button
                        type="button"
                        className="w-full"
                        disabled={hasBlockingIssues || isCheckingPending || isImportPending || !isPreflightClean}
                        onClick={handleImport}
                    >
                        {isImportPending ? "Importando..." : "Importar ventas por receta"}
                    </Button>
                </div>
            </div>
        </section>
    )
}

function RecipeSalesPreview({ preview }: { preview: ReturnType<typeof parseRecipeSalesCsvPreview> | null }) {
    if (!preview) {
        return (
            <div className="flex items-start gap-2 text-sm text-neutral-500">
                <FileText className="mt-0.5 size-4" />
                <p>Pega un CSV para validar fechas, recetas y unidades.</p>
            </div>
        )
    }

    const blockingMessages = [
        ...preview.fileErrors,
        ...preview.duplicates.map(duplicate => `Duplicado interno ${duplicate.key} en filas ${duplicate.rowNumbers.join(", ")}.`),
        ...preview.rows
            .filter(row => row.status === "invalid")
            .flatMap(row => row.errors.map(error => `Fila ${row.rowNumber}: ${error}`)),
    ]

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                    <CheckCircle2 className="size-3" />
                    {preview.validRows} filas válidas
                </Badge>
                <Badge variant={preview.invalidRows > 0 ? "destructive" : "secondary"}>
                    {preview.invalidRows} errores
                </Badge>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs">
                <Metric label="Unidades" value={`${preview.summary.totalUnits} uds.`} />
                <Metric label="Periodo" value={formatPeriod(preview.summary.dateFrom, preview.summary.dateTo)} />
            </dl>
            {blockingMessages.length > 0 && (
                <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    <div className="flex items-center gap-2 font-semibold">
                        <AlertTriangle className="size-3.5" />
                        Revisión necesaria
                    </div>
                    {blockingMessages.slice(0, 4).map(message => (
                        <p key={message}>{message}</p>
                    ))}
                </div>
            )}
        </div>
    )
}

function PreflightStatus({ state, signature }: { state: PreflightState; signature: string }) {
    if (state.status === "idle" || state.signature !== signature) return null
    if (state.status === "checking") return <Status tone="neutral" text="Comprobando duplicados..." />
    if (state.status === "clean") return <Status tone="success" text="Sin duplicados en ventas por receta." />
    if (state.status === "error") return <Status tone="error" text={state.message} />

    return (
        <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="size-3.5" />
                Duplicados existentes
            </div>
            {state.existingRows.slice(0, 4).map(row => (
                <p key={row.key}>{row.message}</p>
            ))}
        </div>
    )
}

function Status({ tone, text }: { tone: "neutral" | "success" | "error"; text: string }) {
    return (
        <div className={cn(
            "rounded-md border px-3 py-2 text-xs font-medium",
            tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
            tone === "error" && "border-red-200 bg-red-50 text-red-700",
            tone === "neutral" && "border-neutral-200 bg-white text-neutral-600",
        )}>
            {text}
        </div>
    )
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-md bg-white p-2 ring-1 ring-neutral-200">
            <dt className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</dt>
            <dd className="mt-1 font-semibold text-neutral-950">{value}</dd>
        </div>
    )
}

function formatPeriod(from: string | null, to: string | null) {
    if (!from || !to) return "Sin fechas"
    return from === to ? from : `${from} · ${to}`
}

function templateHref() {
    return `data:text/csv;charset=utf-8,${encodeURIComponent(RECIPE_SALES_CSV_TEMPLATE)}`
}
