export type ScannedInvoiceResult = {
    supplier: {
        name: string
        tax_id?: string
        address?: string
    }
    date?: string
    total_amount?: number
    invoice_number?: string
    currency: string
    items: Array<{
        description: string
        quantity: number
        unit_price?: number
        total_price?: number
        unit?: string
    }>
}

/**
 * Uses GPT-4o to extract structured data from an invoice image.
 * @param imageUrl Public or Signed URL of the image
 * @param apiKey OpenAI API Key
 */
export async function scanInvoiceWithGPT4o(imageUrl: string, apiKey: string): Promise<ScannedInvoiceResult> {
    const PROMPT = `
    You are an expert accountant system. Extract data from this invoice image into JSON.
    
    Rules:
    1. Extract supplier name, date (YYYY-MM-DD), invoice number, and total amount.
    2. Extract line items. For each item:
       - Clean up the description (remove codes like "COD-123").
       - Detect quantity, unit price, and total.
       - Detect unit if possible (kg, l, unit, box).
       - **Categorize the item** into one of: "Food", "Beverage", "Alcohol", "Cleaning", "Packaging", "Equipment", "Other".
    3. If total_amount is ambiguous, sum the items.
    4. Return ONLY valid JSON matching the schema.
    
    Structure:
    {
        "supplier": { "name": "...", "tax_id": "..." },
        "date": "YYYY-MM-DD",
        "invoice_number": "...",
        "total_amount": 100.00,
        "currency": "EUR",
        "items": [
            { 
                "description": "...", 
                "quantity": 1, 
                "unit_price": 10, 
                "total_price": 10, 
                "unit": "kg",
                "category": "Food" 
            }
        ]
    }
    `

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: PROMPT },
                            {
                                type: "image_url",
                                image_url: {
                                    url: imageUrl,
                                    detail: "high"
                                }
                            }
                        ]
                    }
                ],
                response_format: { type: "json_object" },
                temperature: 0
            })
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`OpenAI API Error: ${response.status} - ${error}`)
        }

        const data = await response.json()
        const content = data.choices[0].message.content
        return JSON.parse(content) as ScannedInvoiceResult

    } catch (error) {
        console.error("OCR Scan Error:", error)
        throw error
    }
}
