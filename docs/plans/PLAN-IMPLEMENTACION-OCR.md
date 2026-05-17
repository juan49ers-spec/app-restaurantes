# Plan de implementación — OCR híbrido (pdfjs-dist + tesseract.js + Edge Function + GPT-4o)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
> **Before touching code:** read [`docs/ai/05-invoices.md`](../ai/05-invoices.md), [`docs/ai/T02-base-de-datos.md`](../ai/T02-base-de-datos.md), [`docs/ai/T03-autenticacion.md`](../ai/T03-autenticacion.md), [`docs/ai/T06-server-actions-comunes.md`](../ai/T06-server-actions-comunes.md). After implementing, update [`docs/ai/05-invoices.md`](../ai/05-invoices.md) per the protocol in [`CLAUDE.md`](../../CLAUDE.md).

**Goal:** Reemplazar el OCR actual (server-side, vision con URL) por una arquitectura híbrida en tres tiempos:

1. **Cliente** (Next App Router): extrae texto del documento con `pdfjs-dist` (PDF nativo) y `tesseract.js` (escaneados/imágenes). Sube el archivo al bucket `invoices` de Storage.
2. **Edge Function de Supabase** (Deno): recibe el texto extraído (o URL firmada si no se pudo extraer texto), llama a GPT-4o, devuelve `ScannedInvoice` JSON estructurado. Esta función es **stateless**: no toca DB.
3. **Server Action de Next** (delgada): persiste el resultado en `invoices`, decrementa créditos solo si la Edge Function usó IA, dispara `revalidatePath`. Tiempo de ejecución <500ms.

Añade extracción de **líneas de factura** (que Factyra no hace pero esta app necesita) y una UI de confianza por campo.

**Architecture:**

```
[Cliente — navegador]
  Usuario suelta PDF/imagen en InvoiceDropzone
        ↓
  extractDocumentText(file)        ← src/lib/ocr/extract-document-text.ts
        ├─ PDF: pdfjs-dist.getTextContent (3 páginas)
        │     ├─ Si calidad OK → texto nativo
        │     └─ Si pobre → renderPdfPageToImage(2.5x) + tesseract.recognize('spa')
        └─ Imagen: tesseract.recognize('spa')
        ↓
  { text, source, quality, pageCount }
        ↓
  Upload archivo a Supabase Storage (bucket invoices, path: ${user.id}/...)
        ↓
  supabase.functions.invoke('analyze-invoice', {
    body: { extractedText, filePath, fileMime, source }
  })
        ↓
[Edge Function — Deno en Supabase]
  ├─ Valida JWT del usuario
  ├─ Resuelve restaurant_id desde DB
  ├─ Si extractedText con calidad suficiente:
  │     → llama GPT-4o con TEXTO (cheaper, faster)
  │  else:
  │     → createSignedUrl del filePath
  │     → llama GPT-4o con IMAGE_URL (último recurso)
  ├─ Valida respuesta con Zod (ScannedInvoiceSchema)
  ├─ Si OpenAI falla → parseInvoiceLocally(extractedText) (regex)
  └─ Devuelve { scanned, used_ai, source }
        ↓
[Cliente]
  saveInvoiceExtraction({ filePath, scanned, used_ai, source })
        ↓
[Server Action — Next, <500ms]
  ├─ INSERT en invoices (status='review_required', scanned_data, file_url)
  ├─ Si used_ai === true → deductCredit(1)
  ├─ revalidatePath
  └─ return { invoiceId }
        ↓
[Cliente]
  Redirige a /invoices/[id]/review
  InvoiceReviewForm + OcrConfidenceCard
```

**Tech Stack:**

- `pdfjs-dist@^5.4.530` (extracción nativa de texto en navegador).
- `tesseract.js@^7.0.0` (OCR en navegador para escaneados).
- **Supabase Edge Functions** (Deno Deploy) para el call a OpenAI.
- OpenAI GPT-4o.
- Next.js 16 + Supabase + Zod (en server actions).
- `zod` también dentro de la Edge Function (Deno-compatible via JSR/npm specifier).

---

## Resumen de decisiones (tomadas con el usuario)

| Decisión | Elección | Por qué |
|----------|----------|---------|
| Alcance | Reemplazo del OCR existente de facturas. Otras superficies (tickets de gasto, etc.) quedan fuera de este plan. | Foco. |
| Cliente vs Servidor para extracción | Cliente (pdfjs + tesseract en el navegador). | Reduce coste de OpenAI ~70% (texto vs vision) y elimina ida-vuelta extra. |
| Proveedor IA | OpenAI GPT-4o. | Consistencia con Factyra y app actual. |
| Dónde corre el call a OpenAI | **Supabase Edge Function** (no Server Action de Next). | Timeout 150s (vs 10s Hobby/60s Pro Vercel), aislamiento del workload caro, reutilizable desde otros clientes, incluido en Supabase Free. |
| Persistencia | Server Action delgada que solo escribe en DB. | Mantiene la convención del repo y el `revalidatePath` de Next funciona. |
| Plan Supabase necesario | **Free tier es suficiente** para empezar. | 500K invocaciones Edge Functions/mes + 100h CPU. A 10K facturas/mes está al 2%. |
| Line items | Sí, vía prompt enriquecido en la Edge Function. | Factyra no los hace; la app de restaurantes los necesita para mapeo a `master_ingredients`. |
| Estrategia de migración | Reemplazo total. Borrar `openai-vision.ts` cuando el flujo nuevo funcione con 3 facturas reales. | El usuario aprobó "cambiar entero si hace falta". |
| Crédito OCR | Se decrementa solo si la Edge Function devolvió `used_ai: true`. Si cae a regex local → no se cobra. | Justo y monitorizable. |

---

## Decisiones técnicas no obvias

1. **Texto-first reduce coste OpenAI ~70%.** Para una factura típica, vision usa ~5K tokens, texto plano usa ~1.5K tokens. Cuando el PDF es digital, evitas pagar vision tokens.
2. **`pdfjs-dist` v5+** usa worker `.mjs`. El plan copia ese worker a `public/` en postinstall — el `import.meta.url` clásico no funciona en build de Next 16.
3. **Render scale 2.5×** antes de Tesseract es **obligatorio** (Factyra lo aprendió por las malas). Sin esto, escaneados a 72 DPI son ilegibles.
4. **Idioma Tesseract `'spa'`** hardcoded. España. Si se internacionaliza, parametrizar.
5. **Edge Function debe validar JWT** con `Authorization: Bearer <token>` para evitar invocaciones anónimas. La cabecera viaja automáticamente cuando usas `supabase.functions.invoke()`.
6. **`OPENAI_API_KEY` se guarda como Supabase secret** (no como env var de Vercel). Se accede en la Edge Function con `Deno.env.get('OPENAI_API_KEY')`.
7. **`scanned_data` JSONB** incluye `_meta.source`, `_meta.used_ai`, `_meta.confidence` para auditoría y para que un dashboard futuro (`/admin/billing` o similar) pueda calcular % de cada path.
8. **`file_url` canónico:** corregimos la inconsistencia `file_url` vs `image_url` (ver `docs/ai/05-invoices.md` §6). Canonizamos a `file_url`.
9. **Bucket privado + signed URL bajo demanda.** El bucket `invoices` mantiene RLS estricto. La página de review firma cuando muestra el PDF, no guarda URLs eternas.
10. **El cliente no llama a OpenAI directamente** (evidente pero conviene escribirlo): no se expone API key en cliente. Edge Function intermedia.

---

## Coste y límites — números concretos

Para 10K facturas/mes (estimación inicial: 100 restaurantes × 100 facturas):

| Recurso | Consumo estimado | Free tier | Pro tier |
|---------|------------------|-----------|----------|
| Edge Function invocations | 10K/mes | 500K incluidos | 2M incluidos |
| Edge Function CPU time | ~28h/mes (10s × 10K) | 100h incluidas | 1000h incluidas |
| OpenAI GPT-4o (texto) — path ~70% | 7K × $0.005 = $35 | — | — |
| OpenAI GPT-4o (vision) — path ~25% | 2.5K × $0.025 = $62.5 | — | — |
| OpenAI fallido (regex local) — path ~5% | $0 | — | — |
| **Coste OpenAI total/mes** | **~$100** | — | — |
| Storage `invoices` bucket | ~5GB (10K × 500KB) | 1GB | 100GB |

**Conclusión:** las Edge Functions están holgadas en Free tier. El cuello que sí podría empujar a Pro es **Storage** (1GB Free vs 100GB Pro) o el **DB compute** según uso de los queries. Esa decisión es independiente de este plan.

---

## Done definition

- Edge Function `analyze-invoice` desplegada en Supabase y accesible vía `supabase.functions.invoke()`.
- `processInvoiceFromExtraction` (server action) acepta el resultado del Edge Function y persiste en `invoices` en <500ms.
- 3 facturas reales procesadas sin caer a `status='error'`: 1 PDF digital, 1 PDF escaneado, 1 imagen JPG.
- Path "PDF digital" entra por `pdf-native` y consume tokens TEXTO (verificable en `scanned_data._meta.source`).
- Si OpenAI cae, el upload **no se rompe**: se guarda con regex local, `used_ai=false`, no se descuenta crédito.
- `OcrConfidenceCard` visible en `/invoices/[id]/review` con ✓/✗ por campo + % completitud.
- RLS policies del bucket `invoices` permiten upload desde cliente autenticado en su propia carpeta.
- `docs/ai/05-invoices.md` actualizado.
- Tests unitarios: `similarity`, `pdf-extractor` (smoke), `local-fallback-parser`.
- `openai-vision.ts` legacy eliminado.
- `npm run typecheck` y `npm run lint` limpios.

---

## Fase 0 — Setup local de Supabase CLI

### Task 0.1: Verificar/instalar Supabase CLI

**Step 1:** Comprobar si está:

```bash
supabase --version
```

**Step 2:** Si no está, instalar (Windows con scoop o npm global):

```bash
npm install -g supabase
# o
scoop install supabase
```

**Step 3:** Login y link al proyecto:

```bash
supabase login
supabase link --project-ref <REF_DEL_PROYECTO>
```

El `REF_DEL_PROYECTO` está en el dashboard de Supabase → Project Settings → General.

**Step 4:** Verificar:

```bash
supabase status
```

Debe listar conexión activa.

**No commit.** Es setup local.

---

## Fase 1 — Migración: storage policies + columnas auxiliares

### Task 1.1: RLS policies del bucket `invoices` para upload cliente

El flujo actual sube desde server (service_role bypass RLS). Al pasar a cliente, hace falta política explícita.

**Files:**
- Create: `supabase/migrations/20260517_invoices_storage_policies.sql`

**Step 1:** Crear migración:

```sql
-- Permitir INSERT a usuarios autenticados solo en su propia carpeta.
-- Convención de path: ${auth.uid()}/timestamp-uuid.ext
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'invoices_insert_own_folder'
  ) THEN
    CREATE POLICY "invoices_insert_own_folder"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'invoices'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'invoices_select_own_folder'
  ) THEN
    CREATE POLICY "invoices_select_own_folder"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'invoices'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'invoices_delete_own_folder'
  ) THEN
    CREATE POLICY "invoices_delete_own_folder"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'invoices'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;
```

**Step 2:** Aplicar:

```bash
supabase db push
```

**Step 3:** Verificar en dashboard → Storage → invoices → Policies. Deben aparecer las 3 nuevas.

**Step 4:** Commit.

```bash
git add supabase/migrations/20260517_invoices_storage_policies.sql
git commit -m "feat(invoices): RLS policies para upload cliente en bucket invoices"
```

### Task 1.2: Columnas auxiliares para analytics + corrección `file_url`

**Files:**
- Create: `supabase/migrations/20260517_invoices_extraction_metadata.sql`

**Step 1:** Detectar nombre actual de la columna del path:

```bash
supabase db dump --schema public --data-only=false | grep -A 20 "CREATE TABLE.*invoices"
```

Ver si la columna es `image_url` o `file_url`.

**Step 2:** Crear migración condicional:

```sql
-- 1) Renombrar image_url → file_url si aún no se ha hecho.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'image_url'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'file_url'
  ) THEN
    ALTER TABLE invoices RENAME COLUMN image_url TO file_url;
  END IF;
END $$;

-- 2) Columnas para auditoría/analytics del OCR (indexables, no escondidas en JSONB).
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS extraction_source TEXT
    CHECK (extraction_source IN (
      'pdf-native', 'pdf-tesseract', 'image-tesseract', 'image-vision', 'local-regex'
    )),
  ADD COLUMN IF NOT EXISTS extraction_confidence NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS used_ai BOOLEAN DEFAULT false;

-- 3) Índice para queries "qué % entra por cada path"
CREATE INDEX IF NOT EXISTS idx_invoices_extraction_source
  ON invoices(restaurant_id, extraction_source);
```

**Step 3:** Aplicar:

```bash
supabase db push
```

**Step 4:** Regenerar tipos TypeScript:

```bash
supabase gen types typescript --linked > src/types/supabase.ts
```

**Step 5:** Commit.

```bash
git add supabase/migrations/20260517_invoices_extraction_metadata.sql src/types/supabase.ts
git commit -m "feat(invoices): file_url canónico + columnas analytics OCR"
```

---

## Fase 2 — Dependencias del cliente

### Task 2.1: Instalar `pdfjs-dist` y `tesseract.js`

**Step 1:**

```bash
npm install pdfjs-dist@^5.4.530 tesseract.js@^7.0.0
```

**Step 2:** Verificar `package.json`. Deben quedar en `dependencies`.

**Step 3:** Commit.

```bash
git add package.json package-lock.json
git commit -m "feat(ocr): añadir pdfjs-dist y tesseract.js"
```

### Task 2.2: Worker de pdfjs en `public/`

**Files:**
- Create: `scripts/copy-pdfjs-worker.mjs`
- Modify: `package.json` (postinstall)
- Modify: `.gitignore`

**Step 1:** Crear `scripts/copy-pdfjs-worker.mjs`:

```js
import { copyFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))

async function main() {
  const workerSrc = require.resolve('pdfjs-dist/build/pdf.worker.min.mjs')
  const destDir = join(__dirname, '..', 'public')
  const dest = join(destDir, 'pdf.worker.min.mjs')
  await mkdir(destDir, { recursive: true })
  await copyFile(workerSrc, dest)
  console.log(`pdfjs worker copied → ${dest}`)
}

main().catch((err) => {
  console.error('Failed copying pdfjs worker:', err)
  process.exit(1)
})
```

**Step 2:** Añadir a `package.json`:

```json
"postinstall": "node scripts/copy-pdfjs-worker.mjs"
```

**Step 3:** Ejecutar y verificar:

```bash
npm run postinstall
ls public/pdf.worker.min.mjs
```

**Step 4:** Añadir a `.gitignore`:

```
public/pdf.worker.min.mjs
```

**Step 5:** Commit.

```bash
git add scripts/copy-pdfjs-worker.mjs package.json .gitignore
git commit -m "build: copiar pdfjs worker a public/ en postinstall"
```

---

## Fase 3 — Librería `similarity` reutilizable

### Task 3.1: `src/lib/similarity.ts` + tests

Factyra usa esta utilidad y la app de restaurantes la necesita para mapeo de proveedores/ingredientes. Hoy hay lógica fuzzy enterrada en `InvoiceIngestionService` — la centralizamos.

**Files:**
- Create: `src/lib/similarity.ts`
- Create: `src/lib/similarity.test.ts`

**Step 1:** Crear `src/lib/similarity.ts`:

```ts
/**
 * Normaliza nombres para comparación fuzzy.
 * - Quita acentos.
 * - Elimina sufijos legales comunes (S.L., S.A., etc.).
 * - Colapsa espacios.
 * - Pasa a minúsculas.
 */
export function normalizeName(input: string): string {
  if (!input) return ''
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(s\.?l\.?u?|s\.?a\.?|s\.?coop|c\.?b\.?|ltd|inc|corp)\b/g, '')
    .replace(/[.,;:'"()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

export function similarityScore(a: string, b: string): number {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) {
    return Math.min(na.length, nb.length) / Math.max(na.length, nb.length)
  }
  const distance = levenshteinDistance(na, nb)
  const maxLen = Math.max(na.length, nb.length)
  return 1 - distance / maxLen
}

export interface SimilarMatch<T> {
  item: T
  score: number
}

export function findSimilarNames<T>(
  query: string,
  candidates: T[],
  threshold = 0.55,
  getName: (c: T) => string = (c) => (c as unknown as { name?: string }).name ?? ''
): SimilarMatch<T>[] {
  if (!query) return []
  const sorted = [...candidates].sort(
    (a, b) => getName(b).length - getName(a).length
  )
  const matches: SimilarMatch<T>[] = []
  for (const item of sorted) {
    const score = similarityScore(query, getName(item))
    if (score >= threshold) matches.push({ item, score })
  }
  return matches.sort((a, b) => b.score - a.score)
}

export const AUTO_SELECT_THRESHOLD = 0.85
export const MIN_SUGGEST_THRESHOLD = 0.55
```

**Step 2:** Crear `src/lib/similarity.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  normalizeName,
  similarityScore,
  findSimilarNames,
  AUTO_SELECT_THRESHOLD,
} from './similarity'

describe('normalizeName', () => {
  it('strips acentos y mayúsculas', () => {
    expect(normalizeName('Cebóllà')).toBe('cebolla')
  })
  it('quita sufijos S.L., S.A.', () => {
    expect(normalizeName('Frutas García S.L.')).toBe('frutas garcia')
  })
  it('colapsa espacios y puntuación', () => {
    expect(normalizeName('  Bar  Pepe,   S.A.U  ')).toBe('bar pepe')
  })
})

describe('similarityScore', () => {
  it('1.0 para idénticos tras normalizar', () => {
    expect(similarityScore('Tomate', 'tomate')).toBe(1)
  })
  it('alto para sufijo legal distinto', () => {
    expect(similarityScore('Frutas García S.L.', 'Frutas García S.A.')).toBeGreaterThan(0.9)
  })
  it('inclusión bidireccional puntúa por ratio', () => {
    const s = similarityScore('Endesa', 'Endesa Energía')
    expect(s).toBeGreaterThan(0.4)
    expect(s).toBeLessThan(1)
  })
})

describe('findSimilarNames', () => {
  const items = [{ name: 'Tomate Pera' }, { name: 'Tomate Rama' }, { name: 'Patata' }]
  it('devuelve matches sobre threshold ordenados', () => {
    const matches = findSimilarNames('Tomate', items, 0.5)
    expect(matches.length).toBe(2)
    expect(matches[0].score).toBeGreaterThanOrEqual(matches[1].score)
  })
  it('vacío cuando nada supera threshold', () => {
    const matches = findSimilarNames('Zanahoria', items, AUTO_SELECT_THRESHOLD)
    expect(matches.length).toBe(0)
  })
})
```

**Step 3:** Ejecutar:

```bash
npm test -- src/lib/similarity.test.ts
```

**Step 4:** Commit.

```bash
git add src/lib/similarity.ts src/lib/similarity.test.ts
git commit -m "feat(ocr): librería similarity reutilizable"
```

---

## Fase 4 — Extracción de texto en cliente

### Task 4.1: `src/lib/ocr/types.ts`

```ts
export type ExtractionSource =
  | 'pdf-native'
  | 'pdf-tesseract'
  | 'image-tesseract'
  | 'image-vision'   // sin texto local; la Edge Function usará vision
  | 'local-regex'    // marcador para casos donde la IA cayó y se usó parser local

export interface ExtractionResult {
  text: string
  source: ExtractionSource
  pageCount: number
  qualityScore: number // 0..1
}
```

### Task 4.2: `src/lib/ocr/pdf-extractor.ts`

```ts
'use client'

import type { ExtractionResult } from './types'

const MAX_PAGES = 3
const MIN_TOTAL_CHARS = 100
const MIN_ALPHANUM_CHARS = 20
const RENDER_SCALE = 2.5

let pdfjsLibPromise: Promise<typeof import('pdfjs-dist')> | null = null

async function getPdfjsLib() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = (async () => {
      const lib = await import('pdfjs-dist')
      lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      return lib
    })()
  }
  return pdfjsLibPromise
}

function assessQuality(text: string) {
  const totalChars = text.length
  const alphanumChars = (text.match(/[a-zA-Z0-9]/g) || []).length
  const isSuspicious = totalChars < MIN_TOTAL_CHARS || alphanumChars < MIN_ALPHANUM_CHARS
  return { totalChars, alphanumChars, isSuspicious }
}

function qualityToScore(text: string): number {
  const q = assessQuality(text)
  if (q.isSuspicious) return 0.2
  if (q.totalChars > 500 && q.alphanumChars > 200) return 1
  return 0.6
}

export async function extractPdfNativeText(file: File): Promise<ExtractionResult> {
  const pdfjsLib = await getPdfjsLib()
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const pageCount = pdf.numPages
  const pagesToRead = Math.min(MAX_PAGES, pageCount)
  const parts: string[] = []

  for (let i = 1; i <= pagesToRead; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? (item as { str: string }).str : ''))
      .join(' ')
    parts.push(pageText)
  }

  const text = parts.join('\n').trim()
  return {
    text,
    source: 'pdf-native',
    pageCount,
    qualityScore: qualityToScore(text),
  }
}

export async function renderPdfPageToImage(file: File, pageNumber = 1): Promise<string> {
  const pdfjsLib = await getPdfjsLib()
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale: RENDER_SCALE })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo crear canvas 2D')
  await page.render({ canvasContext: ctx, viewport }).promise
  return canvas.toDataURL('image/png')
}
```

### Task 4.3: `src/lib/ocr/tesseract-extractor.ts`

```ts
'use client'

import type { ExtractionResult } from './types'

export async function ocrImage(input: File | string): Promise<ExtractionResult> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('spa')
  try {
    const { data } = await worker.recognize(input)
    const text = data.text.trim()
    const source = typeof input === 'string' ? 'pdf-tesseract' : 'image-tesseract'
    const qualityScore = Math.min(1, Math.max(0, data.confidence / 100))
    return { text, source, pageCount: 1, qualityScore }
  } finally {
    await worker.terminate()
  }
}
```

### Task 4.4: `src/lib/ocr/extract-document-text.ts`

```ts
'use client'

import { extractPdfNativeText, renderPdfPageToImage } from './pdf-extractor'
import { ocrImage } from './tesseract-extractor'
import type { ExtractionResult } from './types'

const QUALITY_THRESHOLD = 0.3

export async function extractDocumentText(file: File): Promise<ExtractionResult> {
  const mime = file.type || ''
  const isPdf = mime === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

  try {
    if (isPdf) {
      const native = await extractPdfNativeText(file)
      if (native.qualityScore >= QUALITY_THRESHOLD) return native
      const dataUrl = await renderPdfPageToImage(file, 1)
      const ocr = await ocrImage(dataUrl)
      return { ...ocr, pageCount: native.pageCount }
    }
    if (mime.startsWith('image/')) return await ocrImage(file)
    return { text: '', source: 'image-vision', pageCount: 0, qualityScore: 0 }
  } catch (err) {
    console.error('[extractDocumentText] fallo:', err)
    return { text: '', source: 'image-vision', pageCount: 0, qualityScore: 0 }
  }
}
```

### Task 4.5: Barrel `src/lib/ocr/index.ts`

```ts
export { extractDocumentText } from './extract-document-text'
export type { ExtractionResult, ExtractionSource } from './types'
```

### Task 4.6: Commit

```bash
git add src/lib/ocr/
git commit -m "feat(ocr): pipeline cliente pdfjs → tesseract con cascada de calidad"
```

---

## Fase 5 — Edge Function `analyze-invoice`

### Task 5.1: Crear la Edge Function

**Files:**
- Create: `supabase/functions/analyze-invoice/index.ts`
- Create: `supabase/functions/analyze-invoice/deno.json` (opcional)

**Step 1:** Crear la función con scaffold:

```bash
supabase functions new analyze-invoice
```

Esto crea `supabase/functions/analyze-invoice/index.ts`.

**Step 2:** Reemplazar el contenido por:

```ts
// supabase/functions/analyze-invoice/index.ts
// Edge Function (Deno): análisis OCR de factura vía GPT-4o.
// Recibe texto extraído por el cliente (si está disponible) o un filePath para
// firmar y mandar la imagen al modelo. Devuelve ScannedInvoice JSON.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.94.0'
import { z } from 'https://esm.sh/zod@4.3.6'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o'

const ItemSchema = z.object({
  line_text: z.string().optional(),
  description: z.string(),
  qty: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  unit_price: z.number().nullable().optional(),
  total: z.number().nullable().optional(),
  tax_rate: z.number().nullable().optional(),
  category: z
    .enum(['Food', 'Beverage', 'Alcohol', 'Cleaning', 'Packaging', 'Equipment', 'Other'])
    .nullable()
    .optional(),
})

const ScannedInvoiceSchema = z.object({
  supplier_name: z.string().nullable().optional(),
  supplier_tax_id: z.string().nullable().optional(),
  invoice_number: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  total_amount: z.number().nullable().optional(),
  tax_amount: z.number().nullable().optional(),
  base_amount: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  items: z.array(ItemSchema).default([]),
  confidence: z.number().min(0).max(1).optional(),
})

type ScannedInvoice = z.infer<typeof ScannedInvoiceSchema>

const RequestSchema = z.object({
  extractedText: z.string().default(''),
  filePath: z.string(),
  fileMime: z.string(),
  source: z.enum(['pdf-native', 'pdf-tesseract', 'image-tesseract', 'image-vision']),
})

const SYSTEM_PROMPT = `Eres un extractor de datos de facturas de proveedores de hostelería en España.
Recibes texto extraído de una factura (PDF/imagen ya OCR'd) o una imagen directa.
Devuelve SIEMPRE un objeto JSON válido con la estructura indicada. Sin markdown, sin texto adicional.`

const USER_INSTRUCTIONS = `Extrae los siguientes campos. Si un dato no aparece o no es claro, usa null (no inventes).

Cabecera:
- supplier_name: razón social del proveedor (no del restaurante destinatario).
- supplier_tax_id: CIF/NIF del proveedor (formato letra+8 dígitos o 8 dígitos+letra).
- invoice_number: número de factura literal.
- date: fecha de emisión en formato YYYY-MM-DD.
- total_amount: total de la factura como número (sin símbolo).
- tax_amount: suma de IVA si aparece desglosada.
- base_amount: base imponible (sin IVA).
- currency: ISO 4217 ("EUR" por defecto en España).

Líneas de la tabla (items):
- description: descripción literal del producto.
- qty: cantidad numérica.
- unit: unidad ("kg", "l", "u", "caja", etc.) tal como aparece en la línea.
- unit_price: precio unitario sin IVA.
- total: total de la línea.
- tax_rate: 4, 10, 21 (porcentaje sin signo) si la línea indica IVA por línea.
- category: una de Food, Beverage, Alcohol, Cleaning, Packaging, Equipment, Other.

Reglas:
- Formato decimal: usa punto (1234.56), nunca coma.
- Si el texto está en español, mantén los nombres en español.
- Si no detectas la tabla de items con claridad, devuelve items: [].
- confidence: número 0..1 con tu confianza global en la extracción.

Devuelve únicamente JSON puro.`

const CIF_REGEX = /\b([A-HJ-NP-SUVW]\d{7}[0-9A-J])\b|\b(\d{8}[A-Z])\b/i
const DATE_REGEX = /\b(\d{1,2})\s?[\/\-.]\s?(\d{1,2})\s?[\/\-.]\s?(\d{4})\b/
const INVOICE_NUM_REGEX = /(?:factura|n[ºo°.:]+|numero)\s*[:#]?\s*([A-Z0-9\-/.]{3,})/i

function parseAmount(raw: string): number | null {
  if (!raw) return null
  let clean = raw.trim()
  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/\./g, '').replace(',', '.')
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.')
  }
  const n = parseFloat(clean)
  return Number.isFinite(n) ? n : null
}

function localFallback(text: string): ScannedInvoice {
  let total: number | null = null
  for (const line of text.split('\n')) {
    if (/total|importe/i.test(line)) {
      const m = line.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/)
      if (m) {
        const n = parseAmount(m[1])
        if (n != null && n > 0 && n < 100000 && (total == null || n > total)) total = n
      }
    }
  }

  let date: string | null = null
  const dm = text.match(DATE_REGEX)
  if (dm) {
    const day = parseInt(dm[1], 10)
    const month = parseInt(dm[2], 10)
    const year = parseInt(dm[3], 10)
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }

  const cm = text.match(CIF_REGEX)
  const taxId = cm ? cm[1] || cm[2] || null : null
  const im = text.match(INVOICE_NUM_REGEX)
  const number = im ? im[1] : null

  return {
    supplier_name: null,
    supplier_tax_id: taxId,
    invoice_number: number,
    date,
    total_amount: total,
    tax_amount: null,
    base_amount: null,
    currency: 'EUR',
    items: [],
    confidence: 0.3,
  }
}

async function callOpenAI(args: {
  apiKey: string
  textContent?: string
  imageUrl?: string
}): Promise<ScannedInvoice> {
  const { apiKey, textContent, imageUrl } = args
  const userContent: Array<Record<string, unknown>> = [{ type: 'text', text: USER_INSTRUCTIONS }]
  if (textContent) {
    userContent.push({
      type: 'text',
      text: `--- TEXTO DE LA FACTURA ---\n${textContent}\n--- FIN ---`,
    })
  }
  if (imageUrl) {
    userContent.push({ type: 'image_url', image_url: { url: imageUrl, detail: 'high' } })
  }

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`OpenAI ${res.status}: ${err.slice(0, 200)}`)
  }

  const json = await res.json()
  const raw = json.choices?.[0]?.message?.content
  if (!raw) throw new Error('OpenAI: respuesta sin content')
  const parsed = JSON.parse(raw)
  return ScannedInvoiceSchema.parse(parsed)
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // 1) Auth: validar JWT del usuario.
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  // 2) Parsear body.
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400 })
  }
  const parseRes = RequestSchema.safeParse(body)
  if (!parseRes.success) {
    return new Response(JSON.stringify({ error: 'Body inválido', details: parseRes.error.flatten() }), { status: 400 })
  }
  const input = parseRes.data

  // 3) Decidir path: texto si hay calidad suficiente, si no imagen firmada.
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    // Sin API key, fallback inmediato.
    return new Response(JSON.stringify({
      scanned: localFallback(input.extractedText),
      used_ai: false,
      effective_source: 'local-regex',
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  let scanned: ScannedInvoice | null = null
  let used_ai = false
  let effective_source: string = input.source

  try {
    if (input.extractedText && input.extractedText.length > 50) {
      scanned = await callOpenAI({ apiKey, textContent: input.extractedText })
    } else {
      const { data: signed } = await supabase.storage
        .from('invoices')
        .createSignedUrl(input.filePath, 120)
      if (!signed?.signedUrl) throw new Error('No signed URL')
      scanned = await callOpenAI({ apiKey, imageUrl: signed.signedUrl })
      effective_source = 'image-vision'
    }
    used_ai = true
  } catch (err) {
    console.error('[analyze-invoice] OpenAI fallo:', err)
    scanned = localFallback(input.extractedText)
    used_ai = false
    effective_source = 'local-regex'
  }

  return new Response(JSON.stringify({ scanned, used_ai, effective_source }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
})
```

**Step 3:** Configurar el secret de OpenAI:

```bash
supabase secrets set OPENAI_API_KEY=<tu-clave>
```

Verificar:

```bash
supabase secrets list
```

**Step 4:** Probar localmente:

```bash
supabase functions serve analyze-invoice --env-file .env.local
```

En otra terminal, simular invocación:

```bash
curl -X POST http://localhost:54321/functions/v1/analyze-invoice \
  -H "Authorization: Bearer <JWT_de_un_usuario>" \
  -H "Content-Type: application/json" \
  -d '{
    "extractedText": "Factura Nº FA-2025-0042\nFecha 15/01/2025\nFrutas Garcia S.L. B12345678\nTomate 5 kg 1.50€ 7.50€\nTotal: 7.50 €",
    "filePath": "test/sample.pdf",
    "fileMime": "application/pdf",
    "source": "pdf-native"
  }'
```

Debe devolver un JSON con `scanned.supplier_name`, `items`, `used_ai: true`.

**Step 5:** Deploy a producción:

```bash
supabase functions deploy analyze-invoice
```

**Step 6:** Commit.

```bash
git add supabase/functions/analyze-invoice/
git commit -m "feat(ocr): Edge Function analyze-invoice (Deno, GPT-4o, fallback regex)"
```

---

## Fase 6 — Server Action delgada de persistencia

### Task 6.1: Reemplazar `processInvoice` por `processInvoiceFromExtraction`

**Files:**
- Modify: `src/app/actions/invoices.ts`

**Step 1:** Reemplazar el cuerpo (mantener `getInvoices` y otras lecturas existentes):

```ts
'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabaseServer'
import { revalidatePath } from 'next/cache'
import { getUserRestaurant } from './utils'
import { deductCredit } from './billing'

const ItemSchema = z.object({
  line_text: z.string().optional(),
  description: z.string(),
  qty: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  unit_price: z.number().nullable().optional(),
  total: z.number().nullable().optional(),
  tax_rate: z.number().nullable().optional(),
  category: z
    .enum(['Food', 'Beverage', 'Alcohol', 'Cleaning', 'Packaging', 'Equipment', 'Other'])
    .nullable()
    .optional(),
})

const ScannedSchema = z.object({
  supplier_name: z.string().nullable().optional(),
  supplier_tax_id: z.string().nullable().optional(),
  invoice_number: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  total_amount: z.number().nullable().optional(),
  tax_amount: z.number().nullable().optional(),
  base_amount: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  items: z.array(ItemSchema).default([]),
  confidence: z.number().min(0).max(1).optional(),
})

const InputSchema = z.object({
  filePath: z.string().min(1),
  fileMime: z.string().min(1),
  fileName: z.string().min(1),
  scanned: ScannedSchema,
  used_ai: z.boolean(),
  effective_source: z.enum([
    'pdf-native', 'pdf-tesseract', 'image-tesseract', 'image-vision', 'local-regex',
  ]),
})

const ACCEPTED_MIMES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']

export async function processInvoiceFromExtraction(
  input: z.infer<typeof InputSchema>
): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  const restaurant = await getUserRestaurant()
  if (!restaurant) return { success: false, error: 'No restaurant' }

  const parsed = InputSchema.parse(input)
  if (!ACCEPTED_MIMES.includes(parsed.fileMime)) {
    return { success: false, error: 'Tipo de archivo no soportado' }
  }

  const supabase = await createClient()

  const { data: invoice, error: insertErr } = await supabase
    .from('invoices')
    .insert({
      restaurant_id: restaurant.id,
      file_url: parsed.filePath,
      status: 'review_required',
      scanned_data: parsed.scanned,
      total_amount: parsed.scanned.total_amount ?? null,
      invoice_number: parsed.scanned.invoice_number ?? null,
      date: parsed.scanned.date ?? null,
      extraction_source: parsed.effective_source,
      extraction_confidence: parsed.scanned.confidence ?? null,
      used_ai: parsed.used_ai,
    })
    .select('id')
    .single()

  if (insertErr || !invoice) {
    return { success: false, error: insertErr?.message ?? 'No se pudo crear invoice' }
  }

  if (parsed.used_ai) {
    try {
      await deductCredit(1)
    } catch (e) {
      // No bloquear el flujo si el decremento falla; loguear.
      console.error('[processInvoiceFromExtraction] deductCredit fallo:', e)
    }
  }

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${invoice.id}/review`)
  return { success: true, invoiceId: invoice.id }
}
```

**Step 2:** Eliminar `processInvoice` antigua y `createInvoiceRecord` antigua. Mantener `getInvoices` y demás lecturas.

**Step 3:** Verificar:

```bash
npm run typecheck
```

Habrá errores en componentes que llamaban a `processInvoice(formData)` — se corrigen en Fase 7.

**Step 4:** Commit.

```bash
git add src/app/actions/invoices.ts
git commit -m "feat(invoices): server action delgada — solo persiste extracción"
```

### Task 6.2: Eliminar `openai-vision.ts` legacy

```bash
grep -r "openai-vision" src/ && echo "FAIL — quedan referencias" || git rm src/services/openai-vision.ts
git commit -m "chore(ocr): eliminar openai-vision.ts legacy"
```

---

## Fase 7 — UI: dropzone con pipeline cliente completo

### Task 7.1: Reescribir `InvoiceDropzone.tsx`

**Files:**
- Modify: `src/components/invoices/InvoiceDropzone.tsx`

**Step 1:** Reemplazar:

```tsx
'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { extractDocumentText } from '@/lib/ocr'
import { processInvoiceFromExtraction } from '@/app/actions/invoices'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type Stage = 'idle' | 'extracting' | 'uploading' | 'analyzing' | 'saving' | 'done' | 'error'

interface FileState {
  file: File
  stage: Stage
  message?: string
  invoiceId?: string
}

const ACCEPTED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
const MAX_SIZE_BYTES = 10 * 1024 * 1024

export function InvoiceDropzone({ userId }: { userId: string }) {
  const router = useRouter()
  const [files, setFiles] = useState<FileState[]>([])
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  function updateOne(file: File, patch: Partial<FileState>) {
    setFiles((prev) => prev.map((f) => (f.file === file ? { ...f, ...patch } : f)))
  }

  async function processOne(initial: File) {
    updateOne(initial, { stage: 'extracting' })
    const extraction = await extractDocumentText(initial)

    updateOne(initial, { stage: 'uploading' })
    const ext = initial.name.split('.').pop() ?? 'bin'
    const filePath = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('invoices')
      .upload(filePath, initial, { contentType: initial.type, upsert: false })
    if (upErr) {
      updateOne(initial, { stage: 'error', message: upErr.message })
      return
    }

    updateOne(initial, { stage: 'analyzing' })
    const { data, error } = await supabase.functions.invoke('analyze-invoice', {
      body: {
        extractedText: extraction.text,
        filePath,
        fileMime: initial.type,
        source: extraction.source,
      },
    })
    if (error) {
      updateOne(initial, { stage: 'error', message: error.message })
      return
    }

    updateOne(initial, { stage: 'saving' })
    const result = await processInvoiceFromExtraction({
      filePath,
      fileMime: initial.type,
      fileName: initial.name,
      scanned: data.scanned,
      used_ai: data.used_ai,
      effective_source: data.effective_source,
    })

    if (!result.success) {
      updateOne(initial, { stage: 'error', message: result.error })
      return
    }
    if (!data.used_ai) {
      toast.warning(`${initial.name}: IA no disponible, análisis local. Revisa todos los campos.`)
    }
    updateOne(initial, { stage: 'done', invoiceId: result.invoiceId })
    router.push(`/invoices/${result.invoiceId}/review`)
  }

  async function handleFiles(list: FileList | null) {
    if (!list) return
    const incoming: FileState[] = []
    for (const f of Array.from(list)) {
      if (!ACCEPTED.includes(f.type)) {
        toast.error(`${f.name}: tipo no soportado`)
        continue
      }
      if (f.size > MAX_SIZE_BYTES) {
        toast.error(`${f.name}: supera 10 MB`)
        continue
      }
      incoming.push({ file: f, stage: 'idle' })
    }
    setFiles((prev) => [...prev, ...incoming])
    for (const f of incoming) {
      await processOne(f.file)
    }
  }

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept={ACCEPTED.join(',')}
        multiple
        onChange={(e) => handleFiles(e.target.files)}
      />
      <ul className="space-y-2">
        {files.map((f, i) => (
          <li key={i} className="flex justify-between rounded border p-2">
            <span>{f.file.name}</span>
            <span className="text-sm text-muted-foreground">
              {f.stage === 'extracting' && 'Extrayendo texto…'}
              {f.stage === 'uploading' && 'Subiendo…'}
              {f.stage === 'analyzing' && 'Analizando (IA)…'}
              {f.stage === 'saving' && 'Guardando…'}
              {f.stage === 'done' && '✓ Listo'}
              {f.stage === 'error' && `✗ ${f.message ?? 'Error'}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

(Adaptar markup/clases al estilo del componente original que tengas.)

**Step 2:** Verificar que el padre pasa `userId`. Si no:

```bash
grep -rn "<InvoiceDropzone" src/
```

Pasar `user.id` desde el server component padre.

**Step 3:** Limpiar `UploadInvoice.tsx` si está duplicando flujo:

```bash
grep -r "UploadInvoice" src/
```

Si está sin uso → borrar.

**Step 4:** Commit.

```bash
git add src/components/invoices/InvoiceDropzone.tsx
git commit -m "feat(ocr): dropzone con pipeline cliente — extract → upload → Edge Function → save"
```

---

## Fase 8 — UI: confidence card en review

### Task 8.1: `OcrConfidenceCard.tsx`

**Files:**
- Create: `src/components/invoices/OcrConfidenceCard.tsx`

```tsx
'use client'

import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface ScannedShape {
  supplier_name?: string | null
  supplier_tax_id?: string | null
  invoice_number?: string | null
  date?: string | null
  total_amount?: number | null
  tax_amount?: number | null
  items?: unknown[]
}

interface Props {
  scanned: ScannedShape
  usedAi: boolean
  effectiveSource: string
}

const FIELDS: Array<{ key: keyof ScannedShape; label: string }> = [
  { key: 'supplier_name', label: 'Proveedor' },
  { key: 'supplier_tax_id', label: 'CIF' },
  { key: 'invoice_number', label: 'Nº factura' },
  { key: 'date', label: 'Fecha' },
  { key: 'total_amount', label: 'Total' },
  { key: 'tax_amount', label: 'IVA' },
]

export function OcrConfidenceCard({ scanned, usedAi, effectiveSource }: Props) {
  const itemCount = scanned.items?.length ?? 0
  const present = FIELDS.filter((f) => {
    const v = scanned[f.key]
    return v != null && v !== ''
  })
  const totalSlots = FIELDS.length + 1
  const filledSlots = present.length + (itemCount > 0 ? 1 : 0)
  const pct = Math.round((filledSlots / totalSlots) * 100)

  const badgeColor =
    pct >= 80 ? 'bg-emerald-100 text-emerald-800'
    : pct >= 50 ? 'bg-amber-100 text-amber-800'
    : 'bg-red-100 text-red-800'

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-medium">Resumen OCR</h3>
          <p className="text-xs text-muted-foreground">
            Path: <code>{effectiveSource}</code>
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs ${badgeColor}`}>{pct}%</span>
      </div>
      <ul className="space-y-1.5 text-sm">
        {FIELDS.map((f) => {
          const v = scanned[f.key]
          const ok = v != null && v !== ''
          return (
            <li key={f.key} className="flex items-center gap-2">
              {ok ? (
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-muted-foreground">{f.label}:</span>
              <span className="font-mono">{ok ? String(v) : '—'}</span>
            </li>
          )
        })}
        <li className="flex items-center gap-2">
          {itemCount > 0 ? (
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <span className="text-muted-foreground">Líneas:</span>
          <span className="font-mono">{itemCount}</span>
        </li>
      </ul>
      {!usedAi && (
        <div className="mt-3 flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>IA no disponible. Datos por análisis local — revisa todos los campos.</span>
        </div>
      )}
    </div>
  )
}
```

### Task 8.2: Insertar en la página de review

**Files:**
- Modify: `src/app/invoices/[id]/review/page.tsx`

Buscar el lugar donde se renderiza el formulario de review e insertar:

```tsx
<OcrConfidenceCard
  scanned={invoice.scanned_data}
  usedAi={invoice.used_ai}
  effectiveSource={invoice.extraction_source}
/>
```

**Si el bucket es privado**, firmar el PDF para el iframe:

```ts
const { data: signed } = await supabase.storage
  .from('invoices')
  .createSignedUrl(invoice.file_url, 600) // 10 min
const pdfUrl = signed?.signedUrl
```

Y usar `pdfUrl` en el `<iframe src={pdfUrl} />`.

**Step:** Commit.

```bash
git add src/components/invoices/OcrConfidenceCard.tsx src/app/invoices/[id]/review/page.tsx
git commit -m "feat(ocr): OcrConfidenceCard + signed URL para preview en review"
```

---

## Fase 9 — Verificación end-to-end

### Task 9.1: Tests manuales obligatorios

Antes de mergear, probar y anotar resultado de cada caso:

| # | Caso | Esperado | `extraction_source` | `used_ai` |
|---|------|----------|---------------------|-----------|
| 1 | PDF digital de Makro | review en <10s, items completos | `pdf-native` | `true` |
| 2 | PDF escaneado | review en <30s, items parciales | `pdf-tesseract` o `image-vision` | `true` |
| 3 | Foto JPG (móvil) | review en <30s | `image-tesseract` o `image-vision` | `true` |
| 4 | Apagar `OPENAI_API_KEY` y reintentar #1 | review con regex local, items vacíos | `local-regex` | `false` |
| 5 | Apagar `OPENAI_API_KEY` y subir factura del usuario | flujo no se rompe, badge "IA no disponible" visible | `local-regex` | `false` |
| 6 | Doble subida del mismo archivo | dos invoices distintas (el filePath tiene UUID) — comportamiento aceptable | — | — |
| 7 | PDF de 5 páginas | solo se leen 3 (limitación documentada en `05-invoices.md`) | `pdf-native` | `true` |
| 8 | Archivo .txt (no soportado) | error claro en toast, no se sube | — | — |

Restaurar `OPENAI_API_KEY` tras los tests negativos.

### Task 9.2: Verificación final

```bash
npm run typecheck
npm run lint
npm test
npm run build
ls public/pdf.worker.min.mjs
grep -r "openai-vision" src/ && echo "FAIL" || echo "OK"
```

Todos OK antes de mergear.

---

## Fase 10 — Sincronizar `docs/ai/`

### Task 10.1: Actualizar `docs/ai/05-invoices.md`

Por protocolo de `CLAUDE.md`, obligatorio.

**Cambios:**

1. **§3 Flujo técnico:**
   - Sustituir el flujo viejo por el nuevo pipeline cliente → Edge Function → server action.
   - Listar los `extraction_source` posibles.
   - Mencionar columnas nuevas: `extraction_source`, `extraction_confidence`, `used_ai`.

2. **§4 Reglas:**
   - Crédito se decrementa solo si `used_ai=true`.
   - Bucket es privado, file_url guarda solo `path`, signed URL bajo demanda.

3. **§5 Dependencias:**
   - Añadir `src/lib/ocr/*` y `src/lib/similarity.ts`.
   - Añadir `supabase/functions/analyze-invoice/`.
   - Quitar referencia a `src/services/openai-vision.ts`.
   - Mencionar `pdfjs-dist` y `tesseract.js`.

4. **§6 Casos límite:**
   - Quitar la inconsistencia `file_url`/`image_url`.
   - Añadir: "Si OpenAI cae, `extraction_source='local-regex'` y los items quedan vacíos."
   - Añadir: "PDF >3 páginas: solo se leen las 3 primeras."
   - Añadir: "Bucket privado — al mostrar PDF en review se firma con TTL 10 min."

5. **§7 Al añadir/modificar:**
   - Si tocas el prompt: editar `supabase/functions/analyze-invoice/index.ts` y redeploy con `supabase functions deploy analyze-invoice`.
   - Si tocas el schema de `scanned`: sincronizar en Edge Function + en `src/app/actions/invoices.ts`.

```bash
git add docs/ai/05-invoices.md
git commit -m "docs(ai): actualizar 05-invoices.md con arquitectura Edge Function"
```

### Task 10.2: Actualizar `docs/ai/T01-arquitectura.md`

Añadir al stack:
- `pdfjs-dist` y `tesseract.js`.
- Supabase Edge Functions (Deno) para el call a OpenAI.

```bash
git add docs/ai/T01-arquitectura.md
git commit -m "docs(ai): incluir Edge Functions y pdfjs/tesseract en T01"
```

### Task 10.3: Actualizar `docs/ai/T02-base-de-datos.md`

Añadir a la sección de `invoices`:
- `file_url` (canónico).
- `extraction_source`, `extraction_confidence`, `used_ai`.
- Mencionar nuevas políticas RLS del bucket `invoices`.

```bash
git add docs/ai/T02-base-de-datos.md
git commit -m "docs(ai): nuevas columnas y RLS de invoices en T02"
```

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|------------|
| Bundle cliente crece (tesseract ~1MB) | Alta | Dynamic import — solo se carga si hace falta. |
| pdfjs worker no se encuentra en producción | Media | Postinstall copia a `public/`. Verificar en deploy Vercel. |
| Edge Function timeout en escaneados muy largos | Baja | 150s margen. Si pasa, considerar mover a un job async (no en este plan). |
| `supabase.functions.invoke` lanza por CORS en preview deployments | Media | Configurar CORS headers en la función. La plantilla del CLI ya viene con `cors.ts` opcional — usarlo si aparecen errores. |
| Crédito se decrementa pero la persistencia falla | Baja | Decremento dentro de la server action, después del INSERT. Si INSERT falla, no se cobra. |
| Free tier Edge Functions alcanza límite | Muy baja | A 10K facturas/mes está al 2% del límite Free. |
| El usuario sube factura grande (10MB+) | Media | Validación cliente + RLS. Si pasa, Storage la rechaza por policy de tamaño. |

---

## Comandos de verificación final

```bash
npm run typecheck
npm run lint
npm test
npm run build
ls public/pdf.worker.min.mjs
supabase functions list   # debe listar analyze-invoice
supabase secrets list     # debe contener OPENAI_API_KEY
grep -r "openai-vision" src/ && echo "FAIL" || echo "OK"
grep -rn "image_url" src/ migrations/ supabase/ && echo "REVISAR" || echo "OK"
```

---

## Notas operativas para el implementador

- **Deploy de Edge Function** es independiente del deploy de Next. Cambiar el prompt no requiere redeploy de Vercel.
- **Logs de Edge Function:** `supabase functions logs analyze-invoice` o dashboard → Functions → analyze-invoice → Logs.
- **Coste OpenAI** lo paga la API key configurada en Supabase secrets — no es coste de Supabase ni de Vercel.
- **Rotar API key** se hace con `supabase secrets set OPENAI_API_KEY=<nueva>`. No requiere redeploy de función.
- **Si añades superficie OCR nueva** (ticket de gasto, albarán…), la Edge Function se reutiliza tal cual cambiando el prompt o creando una variante (`analyze-receipt`, `analyze-delivery-note`).
