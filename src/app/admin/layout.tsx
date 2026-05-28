import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import { AdminShell } from '@/components/admin/AdminShell'
import { isAdminEmail } from '@/lib/admin-emails'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email || !isAdminEmail(user.email)) {
        redirect('/')
    }

    return <AdminShell userEmail={user.email}>{children}</AdminShell>
}
