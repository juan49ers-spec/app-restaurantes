"use server";

import { createClient } from "@/lib/supabaseServer";
import { PeriodReport } from "@/types/schema";

export async function getPeriodReport(
    restaurantId: string,
    moduleName: string,
    periodKey: string
): Promise<PeriodReport | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('period_reports')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('module_name', moduleName)
        .eq('period_key', periodKey)
        .maybeSingle();

    if (error) {
        console.error("Error fetching period report:", error);
        return null;
    }

    return data;
}

export async function saveContextNotes(
    restaurantId: string,
    moduleName: string,
    periodKey: string,
    notes: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('period_reports')
        .upsert({
            restaurant_id: restaurantId,
            module_name: moduleName,
            period_key: periodKey,
            context_notes: notes,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'restaurant_id,module_name,period_key'
        });

    if (error) {
        console.error("Error saving context notes:", error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function saveAiDraft(
    restaurantId: string,
    moduleName: string,
    periodKey: string,
    draft: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('period_reports')
        .upsert({
            restaurant_id: restaurantId,
            module_name: moduleName,
            period_key: periodKey,
            ai_draft: draft,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'restaurant_id,module_name,period_key'
        });

    if (error) {
        console.error("Error saving AI draft:", error);
        return { success: false, error: error.message };
    }

    return { success: true };
}
