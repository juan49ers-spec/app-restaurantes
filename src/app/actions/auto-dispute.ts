'use server'

interface DisputeData {
    supplierName: string
    supplierPhone: string | null
    invoiceNumber: string
    invoiceDate: string
    issueType: 'price_spike' | 'missing_items' | 'damaged' | 'quality' | 'other'
    items: { name: string; expected: number; actual: number }[]
    totalDifference: number
}

const issueDescriptions = {
    price_spike: 'variación significativa de precios',
    missing_items: 'artículos faltantes',
    damaged: 'mercancía dañada',
    quality: 'problema de calidad',
    other: 'discrepancia'
}

export async function generateDisputeMessage(data: DisputeData): Promise<string> {
    const itemsList = data.items
        .map(i => `• ${i.name}: Esperado €${i.expected.toFixed(2)} → Facturado €${i.actual.toFixed(2)} (${((i.actual - i.expected) / i.expected * 100).toFixed(0)}%)`)
        .join('\n')

    const message = `Hola ${data.supplierName},

Me pongo en contacto respecto a la factura *${data.invoiceNumber}* del ${data.invoiceDate}.

He detectado una ${issueDescriptions[data.issueType]}:

${itemsList}

*Diferencia total: €${Math.abs(data.totalDifference).toFixed(2)}*

Por favor, revisar y confirmar ajuste o nota de crédito.

Saludos`

    return message.trim()
}

export async function getWhatsAppLink(phone: string, message: string): Promise<string> {
    const cleanPhone = phone.replace(/\D/g, '')
    const encodedMessage = encodeURIComponent(message)
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`
}

// Email template version
export async function generateEmailTemplate(data: DisputeData): Promise<{
    subject: string
    body: string
}> {
    const subject = `Reclamación Factura ${data.invoiceNumber} - ${issueDescriptions[data.issueType]}`

    const body = await generateDisputeMessage(data)

    return { subject, body }
}
