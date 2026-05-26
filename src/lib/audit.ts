import { createClient } from "@/lib/supabaseServer"

interface AuditEvent {
    action: string
    target_type: string
    target_id: string
    metadata?: Record<string, unknown>
}

export async function logAuditEvent(event: AuditEvent): Promise<void> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        await supabase.from('admin_audit_log').insert({
            actor_user_id: user?.id ?? 'unknown',
            action: event.action,
            target_type: event.target_type,
            target_id: event.target_id,
            metadata: event.metadata ?? {},
        })
    } catch {
        console.error("[Audit] Failed to log event:", event.action)
    }
}
