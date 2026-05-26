'use client'

import { useState } from 'react'
import { Printer } from 'lucide-react'
import { markProfessionalReportDraftExported } from '@/app/actions/professional-reporting'
import { Button } from '@/components/ui/button'

export function PrintReportButton({ draftId }: { draftId: string }) {
  const [isPrinting, setIsPrinting] = useState(false)

  async function printReport() {
    setIsPrinting(true)
    await markProfessionalReportDraftExported(draftId)
    window.print()
    setIsPrinting(false)
  }

  return (
    <Button onClick={printReport} disabled={isPrinting}>
      <Printer className="h-4 w-4" />
      {isPrinting ? 'Preparando' : 'Imprimir / guardar PDF'}
    </Button>
  )
}
