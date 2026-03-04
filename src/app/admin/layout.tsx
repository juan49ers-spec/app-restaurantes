import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import { AdminShell } from '@/components/admin/AdminShell'

const ADMIN_EMAILS = ['juan49ers@gmail.com', 'admin@controlhub.com']

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !user.email || !ADMIN_EMAILS.includes(user.email)) {
        redirect('/')
    }

    return <AdminShell userEmail={user.email}>{children}</AdminShell>
}
