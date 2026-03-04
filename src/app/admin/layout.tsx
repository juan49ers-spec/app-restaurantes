import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/app/actions/admin'
import { AdminShell } from '@/components/admin/AdminShell'

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const authorized = await isAdmin()
    if (!authorized) redirect('/login')

    return <AdminShell>{children}</AdminShell>
}
