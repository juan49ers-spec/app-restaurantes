import { Metadata } from 'next'
import { BillingManager } from '@/components/admin/BillingManager'
import { BillingModulesConfig } from '@/components/admin/BillingModulesConfig'
import { getBillingOverview, getRestaurantsBillingList } from '@/app/actions/admin-billing'
import { getBillingModulesConfig } from '@/app/actions/billing-config'
import { Separator } from '@/components/ui/separator'

export const metadata: Metadata = {
    title: 'Gestión de Facturación | Admin Panel',
    description: 'Administración de planes, créditos y pagos de restaurantes',
}

export default async function AdminBillingPage() {
    const [overview, restaurants, billingConfigs] = await Promise.all([
        getBillingOverview(),
        getRestaurantsBillingList(),
        getBillingModulesConfig()
    ])

    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            <section>
                <h2 className="text-3xl font-bold tracking-tight mb-4">Control de Facturación</h2>
                <BillingManager
                    overview={overview}
                    restaurants={restaurants}
                    billingConfigs={billingConfigs}
                />
            </section>

            <Separator />

            <section>
                <div className="flex flex-col space-y-2 mb-6">
                    <h2 className="text-2xl font-bold tracking-tight">Gestión de Planes y Módulos</h2>
                    <p className="text-muted-foreground">
                        Configura los precios mensuales, anuales y características de cada módulo en tiempo real.
                    </p>
                </div>
                <BillingModulesConfig />
            </section>
        </div>
    )
}
