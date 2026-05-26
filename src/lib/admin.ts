import { createClient } from "@/lib/supabaseServer"

function getAdminEmails(): string[] {
    const envAdmins = process.env.ADMIN_EMAILS
    if (!envAdmins) return []
    return envAdmins.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
}

export async function isSuperAdmin(userId?: string): Promise<boolean> {
    const supabase = await createClient()

    if (!userId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.email) return false
        return getAdminEmails().includes(user.email.trim().toLowerCase())
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== userId) return false
    if (!user.email) return false
    return getAdminEmails().includes(user.email.trim().toLowerCase())
}

export async function requireAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
        throw new Error("Unauthorized: authentication required")
    }

    if (!getAdminEmails().includes(user.email.trim().toLowerCase())) {
        throw new Error("Unauthorized: admin access required")
    }

    return user
}

export function getAdminEmailList(): string[] {
    return getAdminEmails()
}
