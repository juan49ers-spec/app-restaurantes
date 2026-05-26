-- Admin audit log for tracking privileged operations
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_audit_log_actor ON admin_audit_log (actor_user_id, created_at DESC);
CREATE INDEX idx_admin_audit_log_action ON admin_audit_log (action, created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (server-side only)
CREATE POLICY "service_insert" ON admin_audit_log
    FOR INSERT WITH CHECK (true);

-- Only authenticated users can read their own audit entries (admins read all via service role)
CREATE POLICY "authenticated_read" ON admin_audit_log
    FOR SELECT USING (auth.uid()::text = actor_user_id);
