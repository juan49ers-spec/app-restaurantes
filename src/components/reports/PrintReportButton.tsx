'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { markProfessionalReportDraftExported } from '@/app/actions/professional-reporting'
import { Button } from '@/components/ui/button'

export function PrintReportButton({ draftId }: { draftId: string }) {
  const [isPrinting, setIsPrinting] = useState(false)

  async function printReport() {
    setIsPrinting(true)
    try {
      await markProfessionalReportDraftExported(draftId)
      window.print()
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <Button onClick={printReport} disabled={isPrinting}>
      <Download className="h-4 w-4" />
      {isPrinting ? 'Preparando PDF' : 'Guardar PDF / imprimir'}
    </Button>
  )
}
