import { getAdminDashboardData } from "@/app/actions/admin-queries"
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient"

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
    const data = await getAdminDashboardData()
    return <AdminDashboardClient data={data} />
}
