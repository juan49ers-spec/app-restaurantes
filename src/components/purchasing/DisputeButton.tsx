'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MessageSquare, ExternalLink, Copy, Check, Mail } from "lucide-react"
import { generateDisputeMessage, getWhatsAppLink, generateEmailTemplate } from "@/app/actions/auto-dispute"
import { toast } from "sonner"

interface DisputeButtonProps {
    supplierName: string
    supplierPhone: string | null
    supplierEmail?: string | null
    invoiceNumber: string
    invoiceDate: string
    priceIssues: { name: string; expected: number; actual: number }[]
}

export function DisputeButton({
    supplierName,
    supplierPhone,
    supplierEmail,
    invoiceNumber,
    invoiceDate,
    priceIssues
}: DisputeButtonProps) {
    const [copied, setCopied] = useState(false)
    const [loading, setLoading] = useState(false)

    const totalDiff = priceIssues.reduce((acc, i) => acc + (i.actual - i.expected), 0)

    const handleWhatsApp = async () => {
        setLoading(true)
        try {
            const message = await generateDisputeMessage({
                supplierName,
                supplierPhone,
                invoiceNumber,
                invoiceDate,
                issueType: 'price_spike',
                items: priceIssues,
                totalDifference: totalDiff
            })

            if (supplierPhone) {
                const link = await getWhatsAppLink(supplierPhone, message)
                window.open(link, '_blank')
            } else {
                await navigator.clipboard.writeText(message)
                setCopied(true)
                toast.success('Mensaje copiado al portapapeles')
                setTimeout(() => setCopied(false), 2000)
            }
        } finally {
            setLoading(false)
        }
    }

    const handleEmail = async () => {
        setLoading(true)
        try {
            const { subject, body } = await generateEmailTemplate({
                supplierName,
                supplierPhone,
                invoiceNumber,
                invoiceDate,
                issueType: 'price_spike',
                items: priceIssues,
                totalDifference: totalDiff
            })

            if (supplierEmail) {
                window.open(`mailto:${supplierEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
            } else {
                await navigator.clipboard.writeText(`${subject}\n\n${body}`)
                setCopied(true)
                toast.success('Email copiado al portapapeles')
                setTimeout(() => setCopied(false), 2000)
            }
        } finally {
            setLoading(false)
        }
    }

    if (priceIssues.length === 0) return null

    return (
        <div className="flex items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={handleWhatsApp}
                disabled={loading}
                className="gap-2 text-green-700 border-green-200 hover:bg-green-50"
            >
                {supplierPhone ? (
                    <>
                        <MessageSquare className="w-3 h-3" />
                        WhatsApp
                        <ExternalLink className="w-3 h-3" />
                    </>
                ) : (
                    <>
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? '¡Copiado!' : 'Copiar'}
                    </>
                )}
            </Button>

            <Button
                variant="outline"
                size="sm"
                onClick={handleEmail}
                disabled={loading}
                className="gap-2 text-blue-700 border-blue-200 hover:bg-blue-50"
            >
                <Mail className="w-3 h-3" />
                Email
            </Button>
        </div>
    )
}
