import { createClient } from "@/lib/supabaseServer"
import { getAdminEmailList, isAdminEmail } from "@/lib/admin-emails"

export async function isSuperAdmin(userId?: string): Promise<boolean> {
    const supabase = await createClient()

    if (!userId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.email) return false
        return isAdminEmail(user.email)
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== userId) return false
    if (!user.email) return false
    return isAdminEmail(user.email)
}

export async function requireAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
        throw new Error("Unauthorized: authentication required")
    }

    if (!isAdminEmail(user.email)) {
        throw new Error("Unauthorized: admin access required")
    }

    return user
}
export { getAdminEmailList }
