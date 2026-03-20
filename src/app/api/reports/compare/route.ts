import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ExtractedMonthlyReport } from "@/lib/report-extractor";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface Discrepancy {
    field: string;
    label: string;
    pdf_value: number;
    db_value: number;
    diff: number;
    diff_pct: number;
    severity: "ok" | "warn" | "error"; // <2% ok, 2-10% warn, >10% error
}

export interface ComparisonResult {
    has_existing_data: boolean;
    discrepancies: Discrepancy[];
    summary: {
        total_checks: number;
        ok: number;
        warnings: number;
        errors: number;
    };
}

/**
 * POST /api/reports/compare
 *
 * Compara datos extraídos de un PDF con los datos ya cargados en DB para ese mes.
 */
export async function POST(request: Request) {
    try {
        const { report, restaurant_id } = (await request.json()) as {
            report: ExtractedMonthlyReport;
            restaurant_id: string;
        };

        if (!report || !restaurant_id) {
            return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
        }

        const monthStart = `${report.month}-01`;
        const monthEnd = `${report.month}-31`;

        // Fetch existing DB data for the month
        const [salesResult, expensesResult] = await Promise.all([
            supabaseAdmin
                .from("daily_sales")
                .select("*")
                .eq("restaurant_id", restaurant_id)
                .gte("date", monthStart)
                .lte("date", monthEnd),
            supabaseAdmin
                .from("operating_expenses")
                .select("*")
                .eq("restaurant_id", restaurant_id)
                .gte("expense_date", monthStart)
                .lte("expense_date", monthEnd),
        ]);

        const sales = salesResult.data || [];
        const expenses = expensesResult.data || [];

        if (sales.length === 0 && expenses.length === 0) {
            return NextResponse.json({
                has_existing_data: false,
                discrepancies: [],
                summary: { total_checks: 0, ok: 0, warnings: 0, errors: 0 },
            } satisfies ComparisonResult);
        }

        const discrepancies: Discrepancy[] = [];

        // Compare revenue
        const dbRevenue = sales.reduce((s: number, r: { revenue_total?: number }) => s + (r.revenue_total || 0), 0);
        if (dbRevenue > 0 || report.billing.total_revenue > 0) {
            discrepancies.push(makeDiscrepancy("billing.total_revenue", "Facturación Total", report.billing.total_revenue, dbRevenue));
        }

        // Compare delivery platforms
        const dbUber = sales.reduce((s: number, r: { delivery_uber_eats?: number }) => s + (r.delivery_uber_eats || 0), 0);
        if (dbUber > 0 || report.billing.delivery_uber_eats > 0) {
            discrepancies.push(makeDiscrepancy("billing.delivery_uber_eats", "Uber Eats", report.billing.delivery_uber_eats, dbUber));
        }

        const dbJustEat = sales.reduce((s: number, r: { delivery_just_eat?: number }) => s + (r.delivery_just_eat || 0), 0);
        if (dbJustEat > 0 || report.billing.delivery_just_eat > 0) {
            discrepancies.push(makeDiscrepancy("billing.delivery_just_eat", "Just Eat", report.billing.delivery_just_eat, dbJustEat));
        }

        // Compare expenses by category
        const expenseByCategory: Record<string, number> = {};
        for (const exp of expenses) {
            const cat = exp.category as string;
            expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (exp.amount || 0);
        }

        for (const item of report.expenses.breakdown) {
            const dbAmount = expenseByCategory[item.category] || 0;
            if (dbAmount > 0 || item.amount > 0) {
                discrepancies.push(makeDiscrepancy(
                    `expenses.${item.category}`,
                    item.category.replace(/_/g, " "),
                    item.amount,
                    dbAmount
                ));
            }
        }

        // Compare total expenses
        const dbTotalExpenses = expenses.reduce((s: number, e: { amount?: number }) => s + (e.amount || 0), 0);
        if (dbTotalExpenses > 0 || report.expenses.total > 0) {
            discrepancies.push(makeDiscrepancy("expenses.total", "Gastos Totales", report.expenses.total, dbTotalExpenses));
        }

        // Compare days open
        const dbDaysOpen = sales.filter((s: { revenue_total?: number }) => (s.revenue_total || 0) > 0).length;
        if (dbDaysOpen > 0 || report.billing.days_open > 0) {
            discrepancies.push(makeDiscrepancy("billing.days_open", "Días Abiertos", report.billing.days_open, dbDaysOpen));
        }

        const summary = {
            total_checks: discrepancies.length,
            ok: discrepancies.filter(d => d.severity === "ok").length,
            warnings: discrepancies.filter(d => d.severity === "warn").length,
            errors: discrepancies.filter(d => d.severity === "error").length,
        };

        return NextResponse.json({
            has_existing_data: true,
            discrepancies,
            summary,
        } satisfies ComparisonResult);
    } catch (err: unknown) {
        const error = err as Error;
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function makeDiscrepancy(field: string, label: string, pdfVal: number, dbVal: number): Discrepancy {
    const diff = pdfVal - dbVal;
    const base = Math.max(Math.abs(pdfVal), Math.abs(dbVal), 1);
    const diffPct = Math.round((Math.abs(diff) / base) * 1000) / 10;

    return {
        field,
        label,
        pdf_value: Math.round(pdfVal * 100) / 100,
        db_value: Math.round(dbVal * 100) / 100,
        diff: Math.round(diff * 100) / 100,
        diff_pct: diffPct,
        severity: diffPct <= 2 ? "ok" : diffPct <= 10 ? "warn" : "error",
    };
}
