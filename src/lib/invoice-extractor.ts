/**
 * Invoice Extractor — Motor de extracción con LLM Vision (Arquitectura Dual)
 *
 * Soporta dos proveedores controlados por la variable de entorno OCR_PROVIDER:
 *   - "ollama"    → Modelo local (glm-ocr, llava, etc.) — Gratis + Privacidad total.
 *   - "anthropic"  → Claude 3.5 Haiku (cloud API) — Rápido y preciso.
 *
 * Si no hay ninguno configurado, devuelve un mock para desarrollo sin dependencia externa.
 */

import { generateText } from "ai";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExtractedInvoiceData {
    type: "VENTA" | "GASTO";
    supplier_name?: string;
    invoice_number?: string;
    date: string; // YYYY-MM-DD
    items: Array<{
        description: string;
        quantity: number;
        unit_price: number;
        total: number;
        category?: string;
    }>;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    total: number;
    payment_method?: "cash" | "card" | "transfer" | "bank";
    expense_category?: string;
    confidence: number; // 0-1
}

export interface ExtractionResult {
    success: boolean;
    data?: ExtractedInvoiceData;
    error?: string;
    raw_response?: string;
}

// ─── System Prompt ───────────────────────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `Eres un analista contable español experto en hostelería y restauración.
Tu trabajo es analizar imágenes de facturas, tickets y albaranes, y extraer los datos financieros en JSON.

REGLAS ESTRICTAS:
1. SIEMPRE devuelve un JSON válido. Nada más. Sin explicaciones ni markdown.
2. Detecta si es un documento de VENTA (ticket de caja del restaurante) o GASTO (factura de un proveedor al restaurante).
3. Para GASTOS, infiere la categoría según el proveedor:
   - Carnicería, pescadería, fruta, verdura → "PROVEEDORES_COMIDA"
   - Distribuidora de bebidas, bodega → "PROVEEDORES_BEBIDA"
   - Iberdrola, Naturgy, agua → "SUMINISTROS"
   - Aseguradora → "RECIBOS_SEGUROS"
   - Fontanero, electricista, reparaciones → "MANTENIMIENTO"
   - Google Ads, redes sociales → "PUBLICIDAD"
   - Banco, préstamo, TPV comisiones → "FINANCIACION"
   - Si no encaja en ninguna → "OTROS"
4. Las fechas SIEMPRE en formato YYYY-MM-DD.
5. Los importes SIEMPRE en euros, números positivos, sin símbolo €.
6. El campo "confidence" es tu autoevaluación de 0 a 1:
   - 0.9-1.0: Documento nítido, todos los datos claros.
   - 0.7-0.89: Algunos datos inferidos pero razonablemente seguros.
   - 0.5-0.69: Documento parcialmente legible, datos incompletos.
   - <0.5: Ilegible o datos muy inciertos.

SCHEMA JSON que debes devolver:
{
  "type": "VENTA" | "GASTO",
  "supplier_name": "string o null",
  "invoice_number": "string o null",
  "date": "YYYY-MM-DD",
  "items": [{"description": "...", "quantity": 1, "unit_price": 0, "total": 0, "category": "..."}],
  "subtotal": 0,
  "tax_rate": 10,
  "tax_amount": 0,
  "total": 0,
  "payment_method": "cash | card | transfer | bank | null",
  "expense_category": "PROVEEDORES_COMIDA | PROVEEDORES_BEBIDA | SUMINISTROS | ... | null",
  "confidence": 0.85
}`;

// ─── Model Resolver (Strategy Pattern) ──────────────────────────────────────

type OCRProvider = "ollama" | "anthropic";

/**
 * Resuelve dinámicamente qué modelo de IA usar según OCR_PROVIDER.
 * Importaciones lazy para no cargar SDKs innecesarios en memoria.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveModel(): Promise<{ model: any; provider: OCRProvider }> {
    const provider = (process.env.OCR_PROVIDER || "mock") as OCRProvider | "mock";

    if (provider === "ollama") {
        const { createOllama } = await import("ollama-ai-provider");
        const modelName = process.env.OLLAMA_MODEL || "glm-ocr";
        const baseURL = process.env.OLLAMA_BASE_URL || "http://localhost:11434/api";

        const ollama = createOllama({ baseURL });
        console.log(`[OCR] Usando Ollama local → modelo: ${modelName}, url: ${baseURL}`);
        return { model: ollama(modelName), provider: "ollama" };
    }

    if (provider === "anthropic") {
        const Anthropic = await import("@ai-sdk/anthropic");
        const modelName = process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest";

        console.log(`[OCR] Usando Anthropic cloud → modelo: ${modelName}`);
        return { model: Anthropic.anthropic(modelName), provider: "anthropic" };
    }

    // Si no hay proveedor configurado, lanzar error controlado que será capturado como mock
    throw new Error("API key");
}

// ─── Extractor Principal ─────────────────────────────────────────────────────

export async function extractInvoiceData(
    fileBuffer: Buffer,
    mimeType: string,
    fileName: string
): Promise<ExtractionResult> {
    try {
        const base64Image = fileBuffer.toString("base64");

        // Validar tipo MIME
        const supportedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
        if (!supportedMimes.includes(mimeType)) {
            return {
                success: false,
                error: `Tipo de archivo no soportado: ${mimeType}. Solo se aceptan PDF, JPEG, PNG, WebP.`,
            };
        }

        // Resolver el modelo según la configuración actual
        const { model, provider } = await resolveModel();

        const mediaType = mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

        console.log(`[OCR] Procesando "${fileName}" con ${provider}...`);

        const { text } = await generateText({
            model,
            system: EXTRACTION_SYSTEM_PROMPT,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "image",
                            image: `data:${mediaType};base64,${base64Image}`,
                        },
                        {
                            type: "text",
                            text: `Analiza esta factura/ticket llamada "${fileName}" y extrae todos los datos financieros en el formato JSON especificado.`,
                        },
                    ],
                },
            ],
            temperature: 0.1,
        });

        // Parsear la respuesta JSON
        const cleanedText = text
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();

        const parsed: ExtractedInvoiceData = JSON.parse(cleanedText);

        if (!parsed.date || !parsed.total) {
            return {
                success: false,
                error: "Datos incompletos: faltan 'date' o 'total'.",
                raw_response: text,
            };
        }

        console.log(`[OCR] ✅ Extracción exitosa (${provider}): confianza ${parsed.confidence}`);
        return {
            success: true,
            data: parsed,
            raw_response: text,
        };
    } catch (err: unknown) {
        const error = err as Error;

        // Si no hay proveedor/API key configurado, devolver mock para desarrollo local
        if (error.message?.includes("API key") || error.message?.includes("401")) {
            console.warn("[OCR] Sin proveedor configurado, retornando mock de desarrollo");
            return createMockExtraction(fileName);
        }

        return {
            success: false,
            error: `Error en extracción (${process.env.OCR_PROVIDER || "sin provider"}): ${error.message}`,
        };
    }
}

// ─── Mock para desarrollo local ──────────────────────────────────────────────

function createMockExtraction(fileName: string): ExtractionResult {
    const isExpense = fileName.toLowerCase().includes("factura") ||
        fileName.toLowerCase().includes("proveedor") ||
        fileName.toLowerCase().includes("albaran");

    return {
        success: true,
        data: {
            type: isExpense ? "GASTO" : "VENTA",
            supplier_name: isExpense ? "Proveedor Mock S.L." : undefined,
            invoice_number: `MOCK-${Date.now()}`,
            date: new Date().toISOString().split("T")[0],
            items: [
                {
                    description: "Producto de ejemplo (mock)",
                    quantity: 1,
                    unit_price: 100,
                    total: 100,
                    category: isExpense ? "Materia Prima" : "Venta",
                },
            ],
            subtotal: 100,
            tax_rate: 10,
            tax_amount: 10,
            total: 110,
            payment_method: "bank",
            expense_category: isExpense ? "PROVEEDORES_COMIDA" : undefined,
            confidence: 0.5,
        },
        raw_response: "MOCK_RESPONSE",
    };
}
