import { getConsultantAccessAdminData } from '@/app/actions/admin-queries'
import { ClientOnboardingWizard } from '@/components/admin/ClientOnboardingWizard'

export const dynamic = 'force-dynamic'

export default async function AdminClientOnboardingPage() {
  const data = await getConsultantAccessAdminData()

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-400">Onboarding</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Nuevo cliente restaurante</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
          Alta interna para que el consultor pueda crear el espacio de trabajo, asignar responsable y arrancar la preparación de datos.
        </p>
      </div>

      <ClientOnboardingWizard data={data} />
    </div>
  )
}
