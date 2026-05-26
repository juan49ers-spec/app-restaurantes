import Link from 'next/link'
import type { PublishedReportSummary } from '@/app/actions/portal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function PortalReportSummary({ report }: { report: PublishedReportSummary }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            {report.periodFrom} a {report.periodTo}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Versión {report.version} · Publicado {new Date(report.publishedAt).toLocaleDateString('es-ES')}
          </p>
        </div>
        <Badge variant="secondary" className="w-fit rounded-md">
          {report.status}
        </Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={`/portal/reports/${report.id}`}>Ver informe</Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/reports/print/${report.id}`}>PDF</Link>
        </Button>
      </div>
    </div>
  )
}
