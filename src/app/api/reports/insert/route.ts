import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
    reportToOperatingExpenses,
    reportToDailySalesSummary,
    type ExtractedMonthlyReport,
} from "@/lib/report-extractor";

const getSupabaseAdmin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

/**
 * POST /api/reports/insert
 *
 * Recibe un ExtractedMonthlyReport (opcionalmente editado) y lo inserta en la DB.
 * También registra la importación en report_imports para historial.
 */
export async function POST(request: Request) {
    try {
        const { report, restaurant_id, file_name, source, discrepancies } = (await request.json()) as {
            report: ExtractedMonthlyReport;
            restaurant_id: string;
            file_name?: string;
            source?: string;
            discrepancies?: unknown[];
        };

        if (!report || !restaurant_id) {
            return NextResponse.json(
                { error: "report y restaurant_id requeridos" },
                { status: 400 }
            );
        }

        const expenses = reportToOperatingExpenses(report, restaurant_id);
        const salesSummary = reportToDailySalesSummary(report, restaurant_id);

        const result: { expenses_inserted: number; sales_inserted: boolean; errors: string[] } = {
            expenses_inserted: 0,
            sales_inserted: false,
            errors: [],
        };

        // Insertar gastos
        if (expenses.length > 0) {
            const { error: expError } = await getSupabaseAdmin()
                .from("operating_expenses")
                .insert(expenses);

            if (expError) {
                result.errors.push(`Expenses: ${expError.message}`);
            } else {
                result.expenses_inserted = expenses.length;
            }
        }

        // Insertar resumen de ventas
        const { error: salesError } = await getSupabaseAdmin()
            .from("daily_sales")
            .insert(salesSummary);

        if (salesError) {
            result.errors.push(`Sales: ${salesError.message}`);
        } else {
            result.sales_inserted = true;
        }

        // Log import in history table (best-effort, don't fail if table doesn't exist)
        try {
            await getSupabaseAdmin().from("report_imports").insert({
                restaurant_id,
                month_key: report.month,
                file_name: file_name || `informe_${report.month}.pdf`,
                source: source || "upload",
                status: result.errors.length === 0 ? "completed" : "partial",
                confidence: report.confidence,
                expenses_inserted: result.expenses_inserted,
                sales_inserted: result.sales_inserted,
                extracted_data: report,
                discrepancies: discrepancies || null,
                errors: result.errors.length > 0 ? result.errors : null,
            });
        } catch {
            // Table might not exist yet - ignore
        }

        return NextResponse.json({
            success: result.errors.length === 0,
            db_result: result,
        });
    } catch (err: unknown) {
        const error = err as Error;
        console.error("[ReportInsert] Error:", error);
        return NextResponse.json(
            { error: `Server error: ${error.message}` },
            { status: 500 }
        );
    }
}
