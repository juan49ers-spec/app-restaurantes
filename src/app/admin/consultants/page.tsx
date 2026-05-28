import { getConsultantAccessAdminData } from '@/app/actions/admin-queries'
import { ConsultantAccessManager } from '@/components/admin/ConsultantAccessManager'

export const dynamic = 'force-dynamic'

export default async function AdminConsultantsPage() {
  const data = await getConsultantAccessAdminData()

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Consultores y clientes</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Gestiona qué usuarios pueden trabajar con qué restaurantes desde la mesa de consultoría.
        </p>
      </div>
      <ConsultantAccessManager data={data} />
    </div>
  )
}
