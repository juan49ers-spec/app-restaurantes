import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
    extractMonthlyReport,
    reportToOperatingExpenses,
    reportToDailySalesSummary,
} from "@/lib/report-extractor";

const getSupabaseAdmin = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const maxDuration = 60;

/**
 * POST /api/reports/extract
 *
 * Recibe un PDF de informe mensual, extrae los datos financieros
 * y opcionalmente los inserta en la base de datos.
 *
 * Body: FormData con:
 *   - file: archivo PDF
 *   - restaurant_id: UUID del restaurante
 *   - auto_insert: "true" para insertar en DB automáticamente (opcional)
 */
export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const restaurantId = formData.get("restaurant_id") as string | null;
        const autoInsert = formData.get("auto_insert") === "true";

        if (!file) {
            return NextResponse.json({ error: "Archivo PDF requerido" }, { status: 400 });
        }

        if (!restaurantId) {
            return NextResponse.json({ error: "restaurant_id requerido" }, { status: 400 });
        }

        // Validar tipo
        if (!file.name.toLowerCase().endsWith(".pdf")) {
            return NextResponse.json(
                { error: "Solo se aceptan archivos PDF" },
                { status: 400 }
            );
        }

        // Convertir a Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Extraer datos del informe
        const result = await extractMonthlyReport(buffer, file.name);

        if (!result.success || !result.data) {
            return NextResponse.json(
                { error: result.error || "Error de extracción", raw_text: result.raw_text },
                { status: 422 }
            );
        }

        const report = result.data;

        // Si auto_insert, guardar en DB
        let dbResult = null;
        if (autoInsert && report.confidence >= 0.6) {
            const expenses = reportToOperatingExpenses(report, restaurantId);
            const salesSummary = reportToDailySalesSummary(report, restaurantId);

            const insertResults: { expenses_inserted: number; sales_inserted: boolean; errors: string[] } = {
                expenses_inserted: 0,
                sales_inserted: false,
                errors: [],
            };

            // Insertar gastos
            if (expenses.length > 0) {
                const { error: expError, count } = await getSupabaseAdmin()
                    .from("operating_expenses")
                    .insert(expenses, { count: "exact" });

                if (expError) {
                    insertResults.errors.push(`Expenses: ${expError.message}`);
                } else {
                    insertResults.expenses_inserted = count || expenses.length;
                }
            }

            // Insertar resumen de ventas
            const { error: salesError } = await getSupabaseAdmin()
                .from("daily_sales")
                .insert(salesSummary);

            if (salesError) {
                insertResults.errors.push(`Sales: ${salesError.message}`);
            } else {
                insertResults.sales_inserted = true;
            }

            dbResult = insertResults;
        }

        return NextResponse.json({
            success: true,
            report,
            db_result: dbResult,
        });
    } catch (err: unknown) {
        const error = err as Error;
        console.error("[ReportExtract] Error:", error);
        return NextResponse.json(
            { error: `Server error: ${error.message}` },
            { status: 500 }
        );
    }
}
