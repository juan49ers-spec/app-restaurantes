# T07 — Pipeline OCR e Ingesta de Facturas

**Archivos clave:** `src/lib/invoice-extractor.ts` (v1), `src/lib/invoice-extractor-v2.ts` (v2), `src/lib/chandra-client.ts`, `src/lib/services/InvoiceIngestionService.ts`, `src/lib/services/InvoiceAtomicService.ts`
**Transversales relacionados:** [05-Invoices](./05-invoices.md), [T02](./T02-base-de-datos.md), [T08](./T08-drive-ingestion.md)

## 1. Arquitectura general

Hay **dos extractores OCR** y un **servicio de ingesta inteligente**. El pipeline completo es:

```
Archivo (PDF/JPG/PNG)
       │
       ├─── invoice-extractor v1 (usado por cron de Drive)
       │         └── Ollama local ó Anthropic Claude
       │
       └─── invoice-extractor v2 (usado por upload manual)
                 └── Chandra → Gemini → Anthropic → Ollama → Mock
                          │
                          v
              ExtractedInvoiceData (JSON estructurado)
                          │
                          v
              InvoiceIngestionService
                 └── fuzzy match → supplier_items / ingestion_buffer / price_history / alerts
                          │
                          v
              InvoiceAtomicService
                 └── RPC upsert_invoice_with_items (transaccional)
```

## 2. Extractor V1 (`invoice-extractor.ts`)

Extractor original. Selecciona proveedor OCR según la variable `OCR_PROVIDER`.

| Proveedor | Env var trigger | Modelo |
|-----------|----------------|--------|
| Ollama local | `OCR_PROVIDER=ollama` | `OLLAMA_MODEL` (default: `glm-ocr`) |
| Anthropic | `OCR_PROVIDER=anthropic` | `ANTHROPIC_MODEL` (default: `claude-3-5-haiku-latest`) |
| Mock | cualquier otro valor | Datos de ejemplo fijos |

**Flujo:**
1. Valida MIME type.
2. Si es PDF → convierte a PNG vía `@/lib/pdf-converter`.
3. Convierte buffer a base64.
4. Envía al proveedor con un prompt estructurado pidiendo JSON.
5. Parsea respuesta, valida que tenga `date` y `total`.
6. Devuelve `ExtractionResult { success, data, error, raw_response }`.

**Usado por:** `/api/cron/process-drive` (ingesta automática desde Google Drive).

**Env vars:** `OCR_PROVIDER`, `OLLAMA_MODEL`, `OLLAMA_BASE_URL`, `ANTHROPIC_MODEL`, `ANTHROPIC_API_KEY`.

## 3. Extractor V2 (`invoice-extractor-v2.ts`)

Versión mejorada con cadena de fallback de 4 proveedores. Intenta cada uno en orden y si falla pasa al siguiente.

| Orden | Proveedor | Condición de activación | Modelo |
|-------|-----------|-------------------------|--------|
| 1 | Chandra | `CHANDRA_API_KEY` presente | API Datalab OCR (85.9% precisión) |
| 2 | Gemini | `GOOGLE_GENERATIVE_AI_API_KEY` presente | `gemini-2.0-flash-exp` |
| 3 | Anthropic | `ANTHROPIC_API_KEY` presente | `claude-3-5-haiku-latest` |
| 4 | Ollama | `OCR_PROVIDER=ollama` | `OLLAMA_MODEL` |
| 5 | Mock | siempre disponible | Datos de ejemplo |

**Mejoras sobre V1:**
- Campo `provider_used` en el resultado (trazabilidad).
- Campo `processing_time_ms` para analytics.
- `checkOCRProvidersHealth()` — comprueba conectividad de cada proveedor.
- Mejor aislamiento JSON para respuestas de Ollama (extrae `{...}` del texto).
- Opción `preferredProvider` para forzar un proveedor concreto.

**Estado:** V2 aún NO está conectado al cron de Drive. Se usa para uploads manuales o tests.

**Env vars:** `CHANDRA_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `ANTHROPIC_API_KEY`, `OCR_PROVIDER`, `OLLAMA_MODEL`, `OLLAMA_BASE_URL`.

## 4. Chandra Client (`chandra-client.ts`)

Cliente HTTP para la API de Datalab Chandra. Soporta dos modos:

- `processDocument(buffer, mimeType, options)` — OCR puro. Devuelve markdown/html/json.
- `extractInvoiceData(buffer, mimeType, fileName)` — Pipeline de dos pasos: OCR + refinamiento LLM. La cadena de refinamiento es: Gemini Flash → Claude Haiku → Ollama local.

**Env vars:** `CHANDRA_API_KEY`.

## 5. Servicio de Ingesta (`InvoiceIngestionService.ts`)

Server Action que procesa las líneas de una factura ya extraída y las conecta con el catálogo de ingredientes.

**Función principal:** `processInvoicePayload(invoiceId, supplierId, lineItems)`

**Lógica por línea:**

| Caso | Condición | Acción |
|------|-----------|--------|
| A — Conocido | Existe en `supplier_items` por nombre | Actualiza precio. Si cambio > 5x → alerta `ANOMALY`. Si 10-500% → alerta `PRICE_SPIKE`. |
| B — Auto-match | `fuzzy_match_ingredient` RPC devuelve score ≥ 0.85 | Crea link en `supplier_items`, actualiza `master_ingredients.current_avg_price`, log en `price_history`. |
| C — Pendiente | Score < 0.85 o sin match | Inserta en `ingestion_buffer` como `PENDING_VALIDATION`. Crea alerta para revisión manual. |

**Constantes:**
- `AUTO_ACCEPT_THRESHOLD = 0.85`
- `PRICE_SPIKE_THRESHOLD = 0.10` (10%)
- `ANOMALY_THRESHOLD = 5.0` (5x)

**Tablas:** `invoices`, `supplier_items`, `master_ingredients`, `ingestion_buffer`, `price_history`, `alerts`.
**RPCs:** `fuzzy_match_ingredient` (usa `pg_trgm`).

## 6. Servicio Atómico (`InvoiceAtomicService.ts`)

Persiste factura + líneas en una transacción SQL vía RPC.

- `saveInvoiceWithItems(data)` → llama RPC `upsert_invoice_with_items`.
- `generateIdempotencyKey(data)` → base64 de `restaurant_id|invoice_number|date|supplier_id|total`.
- `saveInvoiceWithIdempotency(data)` → genera key + guarda.

Garantiza que nunca queden facturas sin líneas o líneas sin factura.

## 7. Variables de entorno completas

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `OCR_PROVIDER` | Sí | Proveedor para V1: `ollama` o `anthropic` |
| `OLLAMA_MODEL` | No | Default: `glm-ocr` (v1) / `qwen2-vl:7b` (chandra fallback) |
| `OLLAMA_BASE_URL` | No | Default: `http://localhost:11434/api` |
| `ANTHROPIC_API_KEY` | Para Anthropic | API key de Anthropic |
| `ANTHROPIC_MODEL` | No | Default: `claude-3-5-haiku-latest` |
| `CHANDRA_API_KEY` | Para Chandra | API key de Datalab Chandra |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Para Gemini | API key de Google AI |

## 8. Al modificar el pipeline OCR

- **Leer:** este archivo + [05-invoices](./05-invoices.md) + [T08-drive-ingestion](./T08-drive-ingestion.md).
- **Si se cambia un prompt OCR:** probar con al menos 3 facturas reales (una limpia, una escaneada con ruido, una con múltiples páginas).
- **Si se añade un proveedor nuevo:** añadirlo en `determineProviderStrategy()` de V2 y documentar su env var aquí.
- **Si se conecta V2 al cron:** cambiar el import en `/api/cron/process-drive/route.ts` de `invoice-extractor` a `invoice-extractor-v2`.
- **Nunca eliminar el mock** — es el safety net para entornos sin API keys.
