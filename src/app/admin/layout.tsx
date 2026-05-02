import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import { AdminShell } from '@/components/admin/AdminShell'
import { isSuperAdmin } from '@/lib/admin'

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email || !(await isSuperAdmin())) {
        redirect('/')
    }

    return <AdminShell userEmail={user.email}>{children}</AdminShell>
}
