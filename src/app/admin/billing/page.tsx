import { Metadata } from 'next'
import { BillingManager } from '@/components/admin/BillingManager'
import { getBillingOverview, getRestaurantsBillingList } from '@/app/actions/admin-billing'

export const metadata: Metadata = {
    title: 'Gestión de Facturación | Admin Panel',
    description: 'Administración de planes, créditos y pagos de restaurantes',
}

export default async function AdminBillingPage() {
    const [overview, restaurants] = await Promise.all([
        getBillingOverview(),
        getRestaurantsBillingList()
    ])

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <BillingManager overview={overview} restaurants={restaurants} />
        </div>
    )
}
