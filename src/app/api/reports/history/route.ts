import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ReportImportRecord {
    id: string;
    month_key: string;
    file_name: string;
    source: string;
    status: string;
    confidence: number;
    expenses_inserted: number;
    sales_inserted: boolean;
    discrepancies: Array<{
        field: string;
        label: string;
        pdf_value: number;
        db_value: number;
        diff_pct: number;
        severity: string;
    }> | null;
    errors: string[] | null;
    created_at: string;
}

/**
 * GET /api/reports/history?restaurant_id=xxx&limit=20
 */
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const restaurantId = url.searchParams.get("restaurant_id");
        const limit = parseInt(url.searchParams.get("limit") || "20");

        if (!restaurantId) {
            return NextResponse.json({ error: "restaurant_id requerido" }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from("report_imports")
            .select("id, month_key, file_name, source, status, confidence, expenses_inserted, sales_inserted, discrepancies, errors, created_at")
            .eq("restaurant_id", restaurantId)
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) {
            // Table might not exist yet - return empty
            if (error.code === "42P01") {
                return NextResponse.json({ imports: [] });
            }
            throw error;
        }

        return NextResponse.json({ imports: data || [] });
    } catch (err: unknown) {
        const error = err as Error;
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
