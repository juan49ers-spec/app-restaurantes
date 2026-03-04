import { getAuditLogs } from "@/app/actions/admin"
import { AuditLogViewer } from "@/components/admin/AuditLogViewer"

export const dynamic = 'force-dynamic'

export default async function AuditPage() {
    const { logs, total } = await getAuditLogs(1, 100)

    return (
        <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Registro de Auditoría</h1>
                <p className="text-sm text-neutral-400 mt-1">
                    Historial completo de operaciones sobre datos financieros y operativos. {total} registros totales.
                </p>
            </div>
            <AuditLogViewer initialLogs={logs} totalCount={total} />
        </div>
    )
}
