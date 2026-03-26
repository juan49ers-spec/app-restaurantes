/**
 * Chandra Client — Integration con Datalab Chandra OCR API
 * 
 * Precisión: 85.9% (top benchmark)
 * Especializado en: tablas complejas, handwriting, multilingual
 * Costo: ~$0.01-0.03 por página
 * 
 * Fallback chain: Chandra → Gemini Flash → Claude Haiku → Manual
 */

interface ChandraConfig {
    apiKey: string
    baseUrl?: string // Default: https://api.datalab.to/v1
    timeout?: number // Default: 60000ms
}

interface ChandraResponse {
    success: boolean
    text?: string
    html?: string
    markdown?: string
    json?: any
    metadata?: {
        num_pages: number
        confidence: number
        processing_time_ms: number
    }
    error?: string
}

interface ChandraError {
    message: string
    type: string
    code?: number
}

/**
 * Cliente principal de Chandra OCR
 */
export class ChandraClient {
    private config: Required<ChandraConfig>

    constructor(config: ChandraConfig) {
        this.config = {
            apiKey: config.apiKey,
            baseUrl: config.baseUrl || 'https://api.datalab.to/v1',
            timeout: config.timeout || 60000
        }
    }

    /**
     * Procesa un documento (PDF o imagen) con Chandra
     * @param fileBuffer Buffer del archivo
     * @param mimeType MIME type del archivo
     * @param options Opciones de procesamiento
     */
    async processDocument(
        fileBuffer: Buffer,
        mimeType: string,
        options: {
            outputFormat?: 'markdown' | 'html' | 'json'
            includeImages?: boolean
            includeHeadersFooters?: boolean
            maxOutputTokens?: number
        } = {}
    ): Promise<ChandraResponse> {
        const {
            outputFormat = 'markdown',
            includeImages = true,
            includeHeadersFooters = false,
            maxOutputTokens = 12384
        } = options

        try {
            // Preparar el archivo para upload
            const formData = new FormData()
            const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType })
            formData.append('file', blob)
            formData.append('output_format', outputFormat)
            formData.append('include_images', includeImages.toString())
            formData.append('include_headers_footers', includeHeadersFooters.toString())
            formData.append('max_output_tokens', maxOutputTokens.toString())

            // Llamada a la API
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

            const response = await fetch(`${this.config.baseUrl}/ocr`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    // FormData se encarga de Content-Type boundary
                },
                body: formData,
                signal: controller.signal
            })

            clearTimeout(timeoutId)

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(
                    `Chandra API error ${response.status}: ${errorData.message || response.statusText}`
                )
            }

            const data = await response.json()

            return {
                success: true,
                text: data.text,
                html: data.html,
                markdown: data.markdown,
                json: data.json,
                metadata: {
                    num_pages: data.num_pages || 1,
                    confidence: data.confidence || 0.85,
                    processing_time_ms: data.processing_time_ms || 0
                }
            }

        } catch (error: unknown) {
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    return {
                        success: false,
                        error: `Timeout after ${this.config.timeout}ms`
                    }
                }
                return {
                    success: false,
                    error: error.message
                }
            }
            return {
                success: false,
                error: 'Unknown error occurred'
            }
        }
    }

    /**
     * Extrae datos estructurados de una factura con Chandra + LLM
     * Combinación: Chandra (OCR) + prompts especializados para facturación
     */
    async extractInvoiceData(
        fileBuffer: Buffer,
        mimeType: string,
        fileName: string
    ): Promise<{
        success: boolean
        data?: any
        error?: string
        confidence: number
    }> {
        // Paso 1: OCR con Chandra
        const ocrResult = await this.processDocument(fileBuffer, mimeType, {
            outputFormat: 'json', // Chandra puede devolver JSON estructurado
            includeImages: false,
            includeHeadersFooters: false
        })

        if (!ocrResult.success || !ocrResult.json) {
            return {
                success: false,
                error: ocrResult.error || 'OCR failed',
                confidence: 0
            }
        }

        // Paso 2: Extraer campos específicos de factura con prompt
        const prompt = this.buildInvoiceExtractionPrompt(ocrResult.json, fileName)
        
        // Usar Gemini Flash o Claude Haiku para la extracción final
        try {
            const { generateText } = await import('ai')
            
            // Intentar primero con Gemini (más rápido y barato)
            let result
            try {
                const Google = await import('@ai-sdk/google')
                result = await generateText({
                    model: Google.google('gemini-2.0-flash-exp'),
                    prompt,
                    temperature: 0.1
                })
            } catch {
                // Intento 2: Claude Haiku (si Gemini falla)
                try {
                    const Anthropic = await import('@ai-sdk/anthropic')
                    result = await generateText({
                        model: Anthropic.anthropic('claude-3-5-haiku-latest'),
                        prompt,
                        temperature: 0.1
                    })
                } catch {
                    // Intento 3: Ollama local (si todo lo demás falla)
                    console.log("[ChandraClient] Fallback a Ollama para refinamiento...");
                    const modelName = process.env.OLLAMA_MODEL || "qwen2-vl:7b"
                    const baseURL = (process.env.OLLAMA_BASE_URL || "http://localhost:11434/api").replace(/\/api$/, '')
                    
                    const response = await fetch(`${baseURL}/api/chat`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            model: modelName,
                            messages: [
                                { role: "user", content: prompt }
                            ],
                            stream: false,
                            format: "json",
                            options: { temperature: 0.1 }
                        })
                    })

                    if (!response.ok) throw new Error("Ollama fallback failed");
                    const ollamaResult = await response.json();
                    result = { text: ollamaResult.message?.content || "{}" };
                }
            }

            const extractedData = JSON.parse(result.text)

            return {
                success: true,
                data: extractedData,
                confidence: ocrResult.metadata?.confidence || 0.85
            }

        } catch (error) {
            return {
                success: false,
                error: `Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                confidence: ocrResult.metadata?.confidence || 0
            }
        }
    }

    /**
     * Construye el prompt para extracción de facturas
     */
    private buildInvoiceExtractionPrompt(ocrData: any, fileName: string): string {
        return `Eres un contable experto en hostelería. Extrae datos de esta factura OCR.

Nombre del archivo: ${fileName}

Datos OCR (JSON crudo - puede contener texto plano y estructura):
${JSON.stringify(ocrData, null, 2)}

⚠️ IMPORTANTE - EXTRACCIÓN DEL PROVEEDOR:
Busca el nombre del proveedor en los datos OCR. Puede aparecer como:
- Texto plano al inicio del documento
- Campo "supplier" o "from" o "proveedor"
- Parte superior de la factura
- Si el nombre está truncado (ej: "Monitor informatic"), infiere el resto lógico

REGLAS PARA EXTRAER PROVEEDOR:
1. Si NO ves claramente el nombre, busca:
   - Cualquier texto en mayúsculas al inicio
   - Texto después de "Proveedor:" / "From:" / "De:" / "Vendedor:"
   - Si ves "Monitor informatic", puede ser "Monitor Informática, S.L." o "Monitor Informática Software, S.L."
   - Si ves parte del nombre, COMPLETA lógicamente (ej: "Carnicer" → "Carnicería Juan Pérez")

2. Para gastos (NO tickets de venta), el proveedor es OBLIGATORIO
   - Si no puedes encontrarlo, usa "Proveedor Desconocido" pero NO dejes el campo vacío

EXTRAE estos campos en formato JSON válido:
{
  "type": "VENTA" o "GASTO",
  "supplier_name": "nombre completo del proveedor (OBLIGATORIO para gastos)",
  "invoice_number": "número de factura",
  "date": "YYYY-MM-DD",
  "items": [
    {
      "description": "descripción del producto",
      "quantity": número,
      "unit_price": número,
      "total": número,
      "category": "Food|Beverage|Alcohol|Cleaning|Packaging|Equipment|Other"
    }
  ],
  "subtotal": número,
  "tax_rate": número (porcentaje),
  "tax_amount": número,
  "total": número,
  "payment_method": "cash|card|transfer|bank|null",
  "expense_category": "PROVEEDORES_COMIDA|PROVEEDORES_BEBIDA|SUMINISTROS|RECIBOS_SEGUROS|MANTENIMIENTO|PUBLICIDAD|FINANCIACION|OTROS|null",
  "confidence": 0.0 a 1.0
}

REGLAS GENERALES:
1. Devuelve SOLO JSON válido. Sin markdown, sin explicaciones.
2. Detecta automáticamente si es VENTA (ticket caja del restaurante) o GASTO (factura proveedor).
3. Para gastos, infiere la categoría según el proveedor.
4. Fechas en formato YYYY-MM-DD.
5. Importes en euros, positivos, sin símbolo €.
6. Confidence: 0.9-1.0 si todo claro, 0.7-0.89 si algo inferido, <0.7 si ilegible.
7. El "total" SIEMPRE debe ser igual a subtotal + tax_amount.
    }
  ],
  "subtotal": número,
  "tax_rate": número (porcentaje),
  "tax_amount": número,
  "total": número,
  "payment_method": "cash|card|transfer|bank|null",
  "expense_category": "PROVEEDORES_COMIDA|PROVEEDORES_BEBIDA|SUMINISTROS|RECIBOS_SEGUROS|MANTENIMIENTO|PUBLICIDAD|FINANCIACION|OTROS|null",
  "confidence": 0.0 a 1.0
}

REGLAS:
1. Devuelve SOLO JSON válido. Sin markdown, sin explicaciones.
2. Detecta automáticamente si es VENTA (ticket caja) o GASTO (factura proveedor).
3. Para gastos, infiere la categoría según el proveedor.
4. Fechas en formato YYYY-MM-DD.
5. Importes en euros, positivos, sin símbolo €.
6. Confidence: 0.9-1.0 si todo claro, 0.7-0.89 si algo inferido, <0.7 si ilegible.`
    }

    /**
     * Health check del servicio
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await fetch(`${this.config.baseUrl}/health`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                signal: AbortSignal.timeout(5000)
            })
            return response.ok
        } catch {
            return false
        }
    }
}

/**
 * Factory function para crear el cliente
 */
export function createChandraClient(config: ChandraConfig): ChandraClient {
    return new ChandraClient(config)
}
