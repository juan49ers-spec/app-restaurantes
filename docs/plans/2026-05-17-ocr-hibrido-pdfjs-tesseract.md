# Plan de implementación — OCR híbrido (pdfjs-dist + tesseract.js + GPT-4o)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
> **Before touching code:** read [`docs/ai/05-invoices.md`](../ai/05-invoices.md), [`docs/ai/T02-base-de-datos.md`](../ai/T02-base-de-datos.md), [`docs/ai/T06-server-actions-comunes.md`](../ai/T06-server-actions-comunes.md). After implementing, update [`docs/ai/05-invoices.md`](../ai/05-invoices.md) per the protocol in [`CLAUDE.md`](../../CLAUDE.md).

**Goal:** Reemplazar el OCR actual (`openai-vision.ts` server → URL al modelo) por una cascada híbrida cliente-primero: extracción nativa de texto con `pdfjs-dist`, fallback a `tesseract.js` para escaneados, envío de texto (no imagen) a GPT-4o, fallback final a regex local. Añade extracción de líneas de factura (que Factyra no hace pero esta app necesita) y una UI de confianza por campo.

**Architecture:**

```
[Cliente]
  Usuario suelta PDF/imagen
        ↓
  extractDocumentText(file)        ← src/lib/ocr/extract-document-text.ts
        ├─ PDF: pdfjs-dist.getTextContent (3 páginas)
        │     ├─ Si calidad OK → texto nativo
        │     └─ Si pobre → renderPdfPageToImage(2.5x) + tesseract.recognize('spa')
        └─ Imagen: tesseract.recognize('spa')
        ↓
  { text, source, quality, pages }
        ↓
  Upload archivo a Supabase Storage (bucket invoices)
        ↓
  processInvoiceFromText(filePath, text, source)   ← server action
        ↓
[Servidor]
  analyzeInvoiceFromText(text)     ← src/services/openai-invoice.ts
        ├─ Llama GPT-4o (texto, no imagen) con prompt restaurant-aware
        ├─ Devuelve { supplier, header, items[], confidence }
        ├─ Si falla → localParser(text) → header mínimo, items=[]
        ↓
  INSERT invoices (status=review_required, scanned_data, source)
        ↓
  Decrementa ocr_credits SOLO si llamó al modelo
        ↓
[Cliente]
  Redirige a /invoices/[id]/review
  InvoiceReviewForm muestra confidence card + items
  Usuario revisa y confirma → updateInvoice (sin cambios)
```

**Tech Stack:**

- `pdfjs-dist@^5.4.530` (extracción nativa de texto en navegador).
- `tesseract.js@^7.0.0` (OCR en navegador para PDFs escaneados e imágenes).
- OpenAI GPT-4o (mantener) — pero recibe **texto** (cheaper, faster) excepto último recurso.
- Next.js 16 App Router + Supabase + Zod.

---

## Resumen de decisiones (tomadas con el usuario)

| Decisión | Elección |
|----------|----------|
| Alcance | (a) Reemplazo del OCR existente de facturas. No se extiende a otros documentos en este plan. |
| Cliente vs Servidor para extracción | **Cliente** (pdfjs + tesseract en el navegador). Sólo el análisis IA se queda en server. |
| Proveedor IA | **OpenAI** (GPT-4o). Sin migrar a otros. |
| Line items | Sí — Factyra no los extrae pero esta app sí los necesita. Se hace con prompt enriquecido a GPT-4o. |
| Estrategia de migración | Reemplazo. El archivo `openai-vision.ts` se reemplaza. Se elimina solo cuando los tests E2E pasen. |

---

## Decisiones técnicas no obvias

1. **Por qué texto y no imagen** para GPT-4o cuando hay texto nativo:
   - ~70% más barato (input tokens vs vision tokens).
   - ~3-5× más rápido.
   - Mejor precisión en facturas digitales (el modelo lee texto, no interpreta píxeles).
2. **Por qué `pdfjs-dist` v5+:** soporta worker como `.mjs`, mejor compat con Next 16 (que ya usa Turbopack/Webpack5).
3. **Render scale 2.5×** antes de Tesseract es **obligatorio** (Factyra lo aprendió por las malas). Sin esto, escaneados a 72 DPI son ilegibles.
4. **Idioma Tesseract `'spa'`** hardcoded. El proyecto opera en España. Si más adelante se internacionaliza, parametrizar.
5. **Crédito OCR se decrementa solo si el modelo se llama.** Si la extracción local (pdfjs+regex local) cubre todo, sería gratis — pero por simplicidad y porque GPT-4o siempre se llama si está disponible, mantenemos el consumo en GPT-4o exitoso. Si GPT-4o falla y se cae a regex local, no se consume crédito.
6. **`scanned_data` JSONB** debe incluir `source` (`pdf-native | tesseract | image-direct | local-regex`) y `confidence` para auditoría y debug.
7. **Field naming:** corregir la inconsistencia `file_url` vs `image_url` (ver `docs/ai/05-invoices.md` §6). Canonizamos a `file_url`.

---

## Done definition

- `processInvoice` server action procesa al menos 3 facturas reales del usuario (1 PDF digital, 1 PDF escaneado, 1 imagen JPG) sin caer a `status='error'`.
- El path "PDF digital" no consume crédito de vision (porque manda texto, no imagen) — o consume al precio de tokens texto.
- `InvoiceReviewForm` muestra confidence card con ✓/✗ por campo + % completitud.
- Si OpenAI cae, el upload **no se rompe** — se guarda con el regex local y status `review_required`.
- `docs/ai/05-invoices.md` actualizado con el flujo nuevo + el inventario de archivos nuevos.
- Tests unitarios pasan: `pdf-extractor`, `tesseract-extractor`, `local-fallback-parser`, `similarity`.
- `openai-vision.ts` legacy eliminado.
- No quedan imports rotos. `npm run typecheck` y `npm run lint` limpios.

---

## Fase 0 — Setup de dependencias

### Task 0.1: Instalar paquetes

**Files:** `package.json`, `package-lock.json`

**Step 1:** Ejecutar

```bash
npm install pdfjs-dist@^5.4.530 tesseract.js@^7.0.0
```

**Step 2:** Verificar que se han añadido a `dependencies` (no a `devDependencies`).

**Step 3:** Commit.

```bash
git add package.json package-lock.json
git commit -m "feat(ocr): add pdfjs-dist and tesseract.js dependencies"
```

### Task 0.2: Servir worker de pdfjs desde `public/`

Next.js no permite importar el worker `.mjs` directamente desde `node_modules` sin gymnastics. Copia el worker a `public/` con un script de postinstall.

**Files:**
- Create: `scripts/copy-pdfjs-worker.mjs`
- Modify: `package.json` (añadir `postinstall`)

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

**Step 2:** Añadir a `package.json` en `scripts`:

```json
"postinstall": "node scripts/copy-pdfjs-worker.mjs"
```

**Step 3:** Ejecutar:

```bash
npm run postinstall
ls public/pdf.worker.min.mjs
```

Debe existir el archivo.

**Step 4:** Añadir `public/pdf.worker.min.mjs` al `.gitignore` (generado en cada install, no se commitea):

```
public/pdf.worker.min.mjs
```

**Step 5:** Commit.

```bash
git add scripts/copy-pdfjs-worker.mjs package.json .gitignore
git commit -m "feat(ocr): copy pdfjs worker to public on postinstall"
```

---

## Fase 1 — Librería compartida `similarity`

### Task 1.1: Extraer `src/lib/similarity.ts`

Factyra tiene esta utilidad y la usa para matching de clientes/compañías. La app de restaurantes la necesita para `master_ingredients` y `suppliers`. Hoy hay lógica fuzzy enterrada en `InvoiceIngestionService`; centralizarla.

**Files:**
- Create: `src/lib/similarity.ts`
- Test: `src/lib/similarity.test.ts`

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
    .replace(/[\u0300-\u036f]/g, '') // acentos
    .toLowerCase()
    .replace(/\b(s\.?l\.?u?|s\.?a\.?|s\.?coop|c\.?b\.?|ltd|inc|corp)\b/g, '')
    .replace(/[.,;:'"()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Distancia de Levenshtein.
 */
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
          matrix[i - 1][j - 1] + 1, // sustitución
          matrix[i][j - 1] + 1,     // inserción
          matrix[i - 1][j] + 1      // borrado
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

/**
 * Score 0..1 (1 = idéntico tras normalizar).
 */
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

/**
 * Encuentra candidatos similares ordenados por score descendente.
 * Solo devuelve los que superan el threshold.
 *
 * Orden de búsqueda: matches por nombre largo primero (más específicos).
 */
export function findSimilarNames<T extends { name?: string | null }>(
  query: string,
  candidates: T[],
  threshold = 0.55,
  getName: (c: T) => string = (c) => c.name ?? ''
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
  const items = [
    { name: 'Tomate Pera' },
    { name: 'Tomate Rama' },
    { name: 'Patata' },
  ]
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

**Step 3:** Ejecutar tests.

```bash
npm test -- src/lib/similarity.test.ts
```

Expected: PASS.

**Step 4:** Commit.

```bash
git add src/lib/similarity.ts src/lib/similarity.test.ts
git commit -m "feat(ocr): añadir lib/similarity reutilizable para fuzzy matching"
```

---

## Fase 2 — Extracción nativa de PDF (cliente)

### Task 2.1: Crear `src/lib/ocr/pdf-extractor.ts`

Lee texto nativo del PDF usando pdfjs-dist. Mide la "calidad" del texto y decide si vale o si hay que caer a Tesseract.

**Files:**
- Create: `src/lib/ocr/pdf-extractor.ts`
- Create: `src/lib/ocr/types.ts`

**Step 1:** Crear `src/lib/ocr/types.ts`:

```ts
export type ExtractionSource =
  | 'pdf-native'      // texto leído del PDF directamente
  | 'pdf-tesseract'   // PDF renderizado a imagen y OCR
  | 'image-tesseract' // imagen pasada directamente a tesseract
  | 'image-vision'    // último recurso: enviar imagen al LLM (no extrajimos texto local)

export interface ExtractionResult {
  text: string
  source: ExtractionSource
  pageCount: number
  qualityScore: number // 0..1
}

export interface QualityHeuristic {
  totalChars: number
  alphanumChars: number
  isSuspicious: boolean
}
```

**Step 2:** Crear `src/lib/ocr/pdf-extractor.ts`:

```ts
'use client'

import type { ExtractionResult, QualityHeuristic } from './types'

const MAX_PAGES = 3
const MIN_TOTAL_CHARS = 100
const MIN_ALPHANUM_CHARS = 20
const RENDER_SCALE = 2.5 // crítico para OCR de escaneados

let pdfjsLibPromise: Promise<typeof import('pdfjs-dist')> | null = null

async function getPdfjsLib() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = (async () => {
      const lib = await import('pdfjs-dist')
      // Worker servido desde public/ (ver scripts/copy-pdfjs-worker.mjs).
      lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      return lib
    })()
  }
  return pdfjsLibPromise
}

function assessQuality(text: string): QualityHeuristic {
  const totalChars = text.length
  const alphanumChars = (text.match(/[a-zA-Z0-9]/g) || []).length
  const isSuspicious = totalChars < MIN_TOTAL_CHARS || alphanumChars < MIN_ALPHANUM_CHARS
  return { totalChars, alphanumChars, isSuspicious }
}

function qualityToScore(q: QualityHeuristic): number {
  if (q.isSuspicious) return 0.2
  if (q.totalChars > 500 && q.alphanumChars > 200) return 1
  return 0.6
}

/**
 * Extrae texto nativo del PDF (sin OCR). Devuelve el texto y un score de calidad.
 * Si el score es <= 0.3, el caller debe caer a OCR con Tesseract.
 */
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
  const quality = assessQuality(text)

  return {
    text,
    source: 'pdf-native',
    pageCount,
    qualityScore: qualityToScore(quality),
  }
}

/**
 * Renderiza una página del PDF a dataURL PNG con scale 2.5× para OCR posterior.
 */
export async function renderPdfPageToImage(
  file: File,
  pageNumber: number = 1
): Promise<string> {
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

**Step 3:** Sanidad — verificar tipos:

```bash
npm run typecheck
```

Expected: limpio (los `as` y any se han evitado intencionalmente).

**Step 4:** Commit.

```bash
git add src/lib/ocr/pdf-extractor.ts src/lib/ocr/types.ts
git commit -m "feat(ocr): extracción nativa de PDF con pdfjs-dist (cliente)"
```

---

## Fase 3 — OCR con Tesseract (fallback)

### Task 3.1: Crear `src/lib/ocr/tesseract-extractor.ts`

**Files:**
- Create: `src/lib/ocr/tesseract-extractor.ts`

**Step 1:** Crear el archivo:

```ts
'use client'

import type { ExtractionResult } from './types'

/**
 * Ejecuta Tesseract sobre una imagen (File o dataURL) en español.
 * Crea worker, recognise, termina.
 */
export async function ocrImage(input: File | string): Promise<ExtractionResult> {
  // Dynamic import: no inflar bundle si nunca se llama.
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('spa')
  try {
    const { data } = await worker.recognize(input)
    const text = data.text.trim()
    const source = typeof input === 'string' ? 'pdf-tesseract' : 'image-tesseract'
    // confidence de tesseract es 0..100 → normalizamos
    const qualityScore = Math.min(1, Math.max(0, data.confidence / 100))
    return { text, source, pageCount: 1, qualityScore }
  } finally {
    await worker.terminate()
  }
}
```

**Step 2:** Commit.

```bash
git add src/lib/ocr/tesseract-extractor.ts
git commit -m "feat(ocr): wrapper tesseract.js (español, single-page)"
```

---

## Fase 4 — Orquestador de extracción

### Task 4.1: Crear `src/lib/ocr/extract-document-text.ts`

Punto de entrada único. Decide qué motor usar según tipo y calidad.

**Files:**
- Create: `src/lib/ocr/extract-document-text.ts`
- Create: `src/lib/ocr/index.ts`

**Step 1:** Crear `src/lib/ocr/extract-document-text.ts`:

```ts
'use client'

import { extractPdfNativeText, renderPdfPageToImage } from './pdf-extractor'
import { ocrImage } from './tesseract-extractor'
import type { ExtractionResult } from './types'

const QUALITY_THRESHOLD = 0.3

/**
 * Extrae texto de un documento usando la cascada:
 *  1) Si es PDF: pdfjs nativo. Si la calidad supera el umbral, devuelve eso.
 *  2) Si la calidad es pobre, renderiza página 1 a imagen y aplica Tesseract.
 *  3) Si es imagen, directamente Tesseract.
 *
 * NUNCA lanza: en el peor caso devuelve { text: '', qualityScore: 0 } y
 * el caller decide qué hacer (probablemente caer a image-vision en server).
 */
export async function extractDocumentText(file: File): Promise<ExtractionResult> {
  const mime = file.type || ''
  const isPdf = mime === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

  try {
    if (isPdf) {
      const native = await extractPdfNativeText(file)
      if (native.qualityScore >= QUALITY_THRESHOLD) return native

      // PDF escaneado: render + tesseract.
      const dataUrl = await renderPdfPageToImage(file, 1)
      const ocr = await ocrImage(dataUrl)
      return { ...ocr, pageCount: native.pageCount }
    }

    // Imagen pura.
    if (mime.startsWith('image/')) {
      return await ocrImage(file)
    }

    // Tipo no soportado.
    return {
      text: '',
      source: 'image-vision',
      pageCount: 0,
      qualityScore: 0,
    }
  } catch (err) {
    console.error('[extractDocumentText] fallo:', err)
    return {
      text: '',
      source: 'image-vision',
      pageCount: 0,
      qualityScore: 0,
    }
  }
}
```

**Step 2:** Crear `src/lib/ocr/index.ts`:

```ts
export { extractDocumentText } from './extract-document-text'
export { extractPdfNativeText, renderPdfPageToImage } from './pdf-extractor'
export { ocrImage } from './tesseract-extractor'
export type { ExtractionResult, ExtractionSource } from './types'
```

**Step 3:** Commit.

```bash
git add src/lib/ocr/extract-document-text.ts src/lib/ocr/index.ts
git commit -m "feat(ocr): orquestador cascada pdf-nativo → tesseract → fallback"
```

---

## Fase 5 — Nuevo servicio OpenAI (texto-first, con line items)

### Task 5.1: Crear `src/services/openai-invoice.ts`

Reemplaza `openai-vision.ts`. Acepta **texto** o **dataURL imagen** según lo que la extracción cliente haya conseguido. Prompt enriquecido para extraer cabecera + ítems de tabla.

**Files:**
- Create: `src/services/openai-invoice.ts`
- Reference (no modify yet): `src/services/openai-vision.ts`

**Step 1:** Crear `src/services/openai-invoice.ts`:

```ts
import 'server-only'
import { z } from 'zod'

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
  category: z.enum(['Food', 'Beverage', 'Alcohol', 'Cleaning', 'Packaging', 'Equipment', 'Other']).nullable().optional(),
})

export const ScannedInvoiceSchema = z.object({
  supplier_name: z.string().nullable().optional(),
  supplier_tax_id: z.string().nullable().optional(),
  invoice_number: z.string().nullable().optional(),
  date: z.string().nullable().optional(), // ISO
  total_amount: z.number().nullable().optional(),
  tax_amount: z.number().nullable().optional(),
  base_amount: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  items: z.array(ItemSchema).default([]),
  confidence: z.number().min(0).max(1).optional(),
})

export type ScannedInvoice = z.infer<typeof ScannedInvoiceSchema>

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
- Si no detectas la tabla de items con suficiente claridad, devuelve items: [].
- confidence: número 0..1 con tu confianza global en la extracción.

Devuelve únicamente JSON puro.`

interface AnalyzeArgs {
  apiKey: string
  textContent?: string
  imageUrl?: string
}

export async function analyzeInvoice(args: AnalyzeArgs): Promise<ScannedInvoice> {
  const { apiKey, textContent, imageUrl } = args
  if (!textContent && !imageUrl) {
    throw new Error('analyzeInvoice: se requiere textContent o imageUrl')
  }

  const userContent: Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }> = [
    { type: 'text', text: USER_INSTRUCTIONS },
  ]

  if (textContent) {
    userContent.push({
      type: 'text',
      text: `--- TEXTO DE LA FACTURA ---\n${textContent}\n--- FIN ---`,
    })
  }

  if (imageUrl) {
    userContent.push({
      type: 'image_url',
      image_url: { url: imageUrl, detail: 'high' },
    })
  }

  const body = {
    model: MODEL,
    temperature: 0,
    response_format: { type: 'json_object' as const },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
  }

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 200)}`)
  }

  const json = await res.json()
  const raw = json.choices?.[0]?.message?.content
  if (!raw) throw new Error('OpenAI: respuesta sin content')

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('OpenAI: JSON inválido')
  }

  // Validar y retornar; si algún campo no encaja, Zod lanzará.
  return ScannedInvoiceSchema.parse(parsed)
}
```

**Step 2:** Commit.

```bash
git add src/services/openai-invoice.ts
git commit -m "feat(ocr): servicio openai-invoice con extracción texto-first y line items"
```

---

## Fase 6 — Fallback regex local

### Task 6.1: Crear `src/lib/ocr/local-fallback-parser.ts`

Cuando OpenAI falla. Saca al menos los 4 campos críticos del texto plano: total, fecha, CIF, número de factura. Items se dejan vacíos — el usuario los introduce a mano.

**Files:**
- Create: `src/lib/ocr/local-fallback-parser.ts`
- Test: `src/lib/ocr/local-fallback-parser.test.ts`

**Step 1:** Crear el parser:

```ts
import type { ScannedInvoice } from '@/services/openai-invoice'

const CIF_REGEX = /\b([A-HJ-NP-SUVW]\d{7}[0-9A-J])\b|\b(\d{8}[A-Z])\b/i
const DATE_REGEX = /\b(\d{1,2})\s?[\/\-.]\s?(\d{1,2})\s?[\/\-.]\s?(\d{4})\b/
const INVOICE_NUM_REGEX = /(?:factura|n[ºo°.:]+|numero)\s*[:#]?\s*([A-Z0-9\-/.]{3,})/i

function parseAmount(raw: string): number | null {
  if (!raw) return null
  let clean = raw.trim()
  if (clean.includes(',') && clean.includes('.')) {
    // Formato europeo "1.234,56" → "1234.56"
    clean = clean.replace(/\./g, '').replace(',', '.')
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.')
  }
  const n = parseFloat(clean)
  return Number.isFinite(n) ? n : null
}

function extractTotal(text: string): number | null {
  // Estrategia: línea con "total" + número europeo, o el número grande más cercano a "TOTAL".
  const lines = text.split('\n')
  let best: number | null = null
  for (const line of lines) {
    if (/total|importe/i.test(line)) {
      const m = line.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/)
      if (m) {
        const n = parseAmount(m[1])
        if (n != null && n > 0 && n < 100000) {
          if (best == null || n > best) best = n
        }
      }
    }
  }
  return best
}

function extractDate(text: string): string | null {
  const m = text.match(DATE_REGEX)
  if (!m) return null
  const day = parseInt(m[1], 10)
  const month = parseInt(m[2], 10)
  const year = parseInt(m[3], 10)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const mm = month.toString().padStart(2, '0')
  const dd = day.toString().padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

function extractTaxId(text: string): string | null {
  const m = text.match(CIF_REGEX)
  return m ? (m[1] || m[2] || null) : null
}

function extractInvoiceNumber(text: string): string | null {
  const m = text.match(INVOICE_NUM_REGEX)
  return m ? m[1] : null
}

/**
 * Extracción local mínima. items siempre vacío — el usuario los rellena a mano.
 * Pensado solo como red de seguridad cuando OpenAI falla.
 */
export function parseInvoiceLocally(text: string): ScannedInvoice {
  return {
    supplier_name: null,
    supplier_tax_id: extractTaxId(text),
    invoice_number: extractInvoiceNumber(text),
    date: extractDate(text),
    total_amount: extractTotal(text),
    tax_amount: null,
    base_amount: null,
    currency: 'EUR',
    items: [],
    confidence: 0.3, // marcamos baja para que el usuario sepa que tiene que revisar todo
  }
}
```

**Step 2:** Tests:

```ts
import { describe, expect, it } from 'vitest'
import { parseInvoiceLocally } from './local-fallback-parser'

describe('parseInvoiceLocally', () => {
  it('extrae total con formato europeo', () => {
    const text = `Factura Nº FA-2025-0042
Fecha 15/01/2025
Frutas Garcia S.L. B12345678
... líneas ...
Total: 1.234,56 €`
    const r = parseInvoiceLocally(text)
    expect(r.total_amount).toBe(1234.56)
  })

  it('extrae fecha en formato dd/mm/yyyy', () => {
    const r = parseInvoiceLocally('Fecha: 05/03/2025')
    expect(r.date).toBe('2025-03-05')
  })

  it('extrae CIF español', () => {
    const r = parseInvoiceLocally('Proveedor: Frutas García SL B12345678')
    expect(r.supplier_tax_id).toBe('B12345678')
  })

  it('items siempre vacío', () => {
    const r = parseInvoiceLocally('cualquier texto con muchos items 12 kg 3,40')
    expect(r.items).toEqual([])
  })

  it('confidence bajo', () => {
    const r = parseInvoiceLocally('')
    expect(r.confidence).toBeLessThan(0.5)
  })
})
```

**Step 3:** Ejecutar:

```bash
npm test -- src/lib/ocr/local-fallback-parser.test.ts
```

**Step 4:** Commit.

```bash
git add src/lib/ocr/local-fallback-parser.ts src/lib/ocr/local-fallback-parser.test.ts
git commit -m "feat(ocr): parser local regex como fallback si openai falla"
```

---

## Fase 7 — Refactor de server actions

### Task 7.1: Reemplazar `processInvoice` con flujo texto-first

Hoy `processInvoice` (en `src/app/actions/invoices.ts`) sube el archivo y manda la URL a `scanInvoiceWithGPT4o`. Lo cambiamos para aceptar **texto extraído por el cliente** y opcionalmente la `imageDataUrl` como último recurso.

**Files:**
- Modify: `src/app/actions/invoices.ts`
- Modify: `src/app/actions/billing.ts` (mover deduct de crédito a sitio nuevo)

**Step 1:** Leer estado actual:

```bash
cat src/app/actions/invoices.ts
cat src/app/actions/billing.ts
```

Anotar:
- Función `processInvoice(formData)` ~líneas 22-129.
- Función `createInvoiceRecord(filePath)` ~líneas 131-212.
- Llamada a `scanInvoiceWithGPT4o(signedUrl, apiKey)`.
- `deductCredit(1)` tras éxito.

**Step 2:** Crear nueva action `processInvoiceFromExtraction`:

Reemplaza el cuerpo de `processInvoice` y `createInvoiceRecord` por la nueva firma. Toda la lógica antigua se borra; se reusa solo el wrapper de upload a Storage + el INSERT de `invoices`.

Nueva firma (en `src/app/actions/invoices.ts`):

```ts
'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabaseServer'
import { revalidatePath } from 'next/cache'
import { getUserRestaurant } from './utils'
import { checkCreditsAvailable, deductCredit } from './billing'
import { analyzeInvoice, ScannedInvoiceSchema } from '@/services/openai-invoice'
import { parseInvoiceLocally } from '@/lib/ocr/local-fallback-parser'

const ExtractionInputSchema = z.object({
  filePath: z.string().min(1),
  fileMime: z.string().min(1),
  fileName: z.string().min(1),
  extractedText: z.string().default(''),
  source: z.enum(['pdf-native', 'pdf-tesseract', 'image-tesseract', 'image-vision']),
  qualityScore: z.number().min(0).max(1),
})

type ExtractionInput = z.infer<typeof ExtractionInputSchema>

interface ProcessResult {
  success: boolean
  invoiceId?: string
  error?: string
  usedFallback?: boolean
}

export async function processInvoiceFromExtraction(
  input: ExtractionInput
): Promise<ProcessResult> {
  const restaurant = await getUserRestaurant()
  if (!restaurant) return { success: false, error: 'No restaurant' }

  const parsed = ExtractionInputSchema.parse(input)
  const supabase = await createClient()

  // 1) Crear fila inicial en invoices (status processing).
  const { data: invoice, error: insertErr } = await supabase
    .from('invoices')
    .insert({
      restaurant_id: restaurant.id,
      file_url: parsed.filePath, // canonizado: file_url (no image_url)
      status: 'processing',
      scanned_data: null,
    })
    .select('id')
    .single()

  if (insertErr || !invoice) {
    return { success: false, error: insertErr?.message ?? 'No se pudo crear invoice' }
  }

  // 2) Intentar análisis IA. Si falla, caer a regex local.
  const apiKey = process.env.OPENAI_API_KEY
  let scanned: z.infer<typeof ScannedInvoiceSchema> | null = null
  let usedFallback = false

  // ¿Tenemos crédito y API key?
  const hasCredits = await checkCreditsAvailable()
  const canUseAI = !!apiKey && hasCredits

  if (canUseAI) {
    try {
      // Si hay texto suficiente, mandar TEXTO (más barato/rápido).
      // Si la calidad es nula y es imagen/escaneado sin texto, mandar la URL firmada.
      if (parsed.extractedText && parsed.qualityScore > 0.2) {
        scanned = await analyzeInvoice({
          apiKey: apiKey!,
          textContent: parsed.extractedText,
        })
      } else {
        // Generar signed URL para que GPT-4o vea la imagen.
        const { data: signed } = await supabase.storage
          .from('invoices')
          .createSignedUrl(parsed.filePath, 120)
        if (!signed?.signedUrl) throw new Error('No signed URL')
        scanned = await analyzeInvoice({
          apiKey: apiKey!,
          imageUrl: signed.signedUrl,
        })
      }
      await deductCredit(1)
    } catch (err) {
      console.error('[processInvoice] AI fallo, usando regex local:', err)
      usedFallback = true
    }
  } else {
    usedFallback = true
  }

  if (!scanned) {
    // Fallback regex local sobre el texto que el cliente extrajo (puede estar vacío).
    scanned = parseInvoiceLocally(parsed.extractedText)
  }

  // 3) Persistir scanned_data + cambiar status.
  const { error: updateErr } = await supabase
    .from('invoices')
    .update({
      status: 'review_required',
      scanned_data: {
        ...scanned,
        _meta: {
          source: parsed.source,
          quality: parsed.qualityScore,
          used_fallback: usedFallback,
        },
      },
      total_amount: scanned.total_amount ?? null,
      invoice_number: scanned.invoice_number ?? null,
      date: scanned.date ?? null,
    })
    .eq('id', invoice.id)

  if (updateErr) {
    return { success: false, error: updateErr.message, invoiceId: invoice.id }
  }

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${invoice.id}/review`)

  return { success: true, invoiceId: invoice.id, usedFallback }
}

// LEGADO: mantener export de getInvoices y otros queries existentes intactos.
// Sólo se reemplaza processInvoice y createInvoiceRecord.
```

**Step 3:** Eliminar funciones antiguas:

- Quitar `processInvoice(formData)` antigua (la del FormData).
- Quitar `createInvoiceRecord(filePath)` antigua.
- Mantener `getInvoices()` y queries de lectura.

**Step 4:** Confirmar que `getInvoices` y demás siguen funcionando:

```bash
npm run typecheck
```

Expected: errores donde antes se llamaba `processInvoice` (en componentes de UI). Esos se corrigen en Fase 8.

**Step 5:** Commit.

```bash
git add src/app/actions/invoices.ts
git commit -m "feat(ocr): processInvoiceFromExtraction recibe texto del cliente; regex local fallback"
```

### Task 7.2: Eliminar `openai-vision.ts`

Una vez ya no se importa de ninguna parte:

**Step 1:** Verificar que nadie lo importa:

```bash
grep -r "openai-vision" src/ || echo "limpio"
```

Esperado: "limpio". Si hay referencias, corregirlas primero.

**Step 2:** Borrar el archivo:

```bash
git rm src/services/openai-vision.ts
```

**Step 3:** Commit.

```bash
git commit -m "chore(ocr): eliminar openai-vision.ts legacy"
```

---

## Fase 8 — UI: nuevo flujo de subida

### Task 8.1: Refactor de `InvoiceDropzone.tsx`

Hoy `InvoiceDropzone` envía un `FormData` con el archivo y la action server hace todo. Ahora:

1. Cliente extrae texto con `extractDocumentText`.
2. Cliente sube archivo a Supabase Storage.
3. Cliente llama `processInvoiceFromExtraction({ filePath, fileMime, fileName, extractedText, source, qualityScore })`.

**Files:**
- Modify: `src/components/invoices/InvoiceDropzone.tsx`

**Step 1:** Reescribir el componente (skeleton — adaptar al markup existente):

```tsx
'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { extractDocumentText } from '@/lib/ocr'
import { processInvoiceFromExtraction } from '@/app/actions/invoices'
import { toast } from 'sonner'

type Stage = 'idle' | 'extracting' | 'uploading' | 'analyzing' | 'done' | 'error'

interface FileState {
  file: File
  stage: Stage
  message?: string
  invoiceId?: string
}

const ACCEPTED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export function InvoiceDropzone({ userId }: { userId: string }) {
  const [files, setFiles] = useState<FileState[]>([])
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function processOne(initial: File): Promise<FileState> {
    const state: FileState = { file: initial, stage: 'extracting' }
    setFiles((prev) => prev.map((f) => (f.file === initial ? state : f)))

    // 1) Extracción cliente.
    const extraction = await extractDocumentText(initial)

    // 2) Subir a Storage.
    state.stage = 'uploading'
    setFiles((prev) => prev.map((f) => (f.file === initial ? { ...state } : f)))
    const ext = initial.name.split('.').pop() ?? 'bin'
    const filePath = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('invoices')
      .upload(filePath, initial, { contentType: initial.type, upsert: false })
    if (upErr) {
      return { ...state, stage: 'error', message: upErr.message }
    }

    // 3) Server action.
    state.stage = 'analyzing'
    setFiles((prev) => prev.map((f) => (f.file === initial ? { ...state } : f)))
    const result = await processInvoiceFromExtraction({
      filePath,
      fileMime: initial.type,
      fileName: initial.name,
      extractedText: extraction.text,
      source: extraction.source,
      qualityScore: extraction.qualityScore,
    })

    if (!result.success) {
      return { ...state, stage: 'error', message: result.error }
    }
    if (result.usedFallback) {
      toast.warning(`${initial.name}: IA no disponible, usado análisis local. Revisa todos los campos.`)
    }
    return { ...state, stage: 'done', invoiceId: result.invoiceId }
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
    // Procesar en serie para no saturar (Tesseract es pesado).
    for (const f of incoming) {
      const final = await processOne(f.file)
      setFiles((prev) => prev.map((x) => (x.file === f.file ? final : x)))
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

(Adaptar markup/clases al estilo del componente original, manteniendo el espíritu.)

**Step 2:** Verificar que el caller pasa `userId`:

```bash
grep -r "InvoiceDropzone" src/
```

Ajustar `InvoicesPage` o el padre para pasar `user.id`.

**Step 3:** Commit.

```bash
git add src/components/invoices/InvoiceDropzone.tsx
git commit -m "feat(ocr): dropzone con pipeline cliente (extract → upload → analyze)"
```

### Task 8.2: Limpiar `UploadInvoice.tsx`

Si existe y duplicaba el flujo, reemplazar por una llamada a `InvoiceDropzone` o eliminar. (Comprobar antes uso real.)

```bash
grep -r "UploadInvoice" src/
```

Si está sin uso, borrar:

```bash
git rm src/components/invoices/UploadInvoice.tsx
git commit -m "chore(ocr): eliminar UploadInvoice legacy"
```

---

## Fase 9 — UI: confidence card en review

### Task 9.1: Componente `OcrConfidenceCard.tsx`

Replicar el "Resumen OCR" de Factyra. Muestra ✓/✗ por campo + % completitud + warning si bajo.

**Files:**
- Create: `src/components/invoices/OcrConfidenceCard.tsx`

**Step 1:**

```tsx
'use client'

import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import type { ScannedInvoice } from '@/services/openai-invoice'

interface Props {
  scanned: ScannedInvoice & { _meta?: { source?: string; used_fallback?: boolean } }
}

const FIELDS: Array<{ key: keyof ScannedInvoice; label: string }> = [
  { key: 'supplier_name', label: 'Proveedor' },
  { key: 'supplier_tax_id', label: 'CIF' },
  { key: 'invoice_number', label: 'Nº factura' },
  { key: 'date', label: 'Fecha' },
  { key: 'total_amount', label: 'Total' },
  { key: 'tax_amount', label: 'IVA' },
]

export function OcrConfidenceCard({ scanned }: Props) {
  const present = FIELDS.filter((f) => {
    const v = scanned[f.key]
    return v != null && v !== ''
  })
  const itemCount = scanned.items?.length ?? 0
  const totalSlots = FIELDS.length + 1 // +1 por items
  const filledSlots = present.length + (itemCount > 0 ? 1 : 0)
  const pct = Math.round((filledSlots / totalSlots) * 100)

  const badgeColor =
    pct >= 80 ? 'bg-emerald-100 text-emerald-800'
    : pct >= 50 ? 'bg-amber-100 text-amber-800'
    : 'bg-red-100 text-red-800'

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium">Resumen OCR</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs ${badgeColor}`}>
          {pct}% completado
        </span>
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
      {scanned._meta?.used_fallback && (
        <div className="mt-3 flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>IA no disponible. Datos extraídos por análisis local — revisa todos los campos.</span>
        </div>
      )}
      {pct < 50 && !scanned._meta?.used_fallback && (
        <div className="mt-3 flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Pocos campos detectados. Revisa manualmente.</span>
        </div>
      )}
    </div>
  )
}
```

**Step 2:** Insertarlo en `src/app/invoices/[id]/review/page.tsx` (o en `InvoiceReviewForm`), pasándole `invoice.scanned_data`:

```tsx
<OcrConfidenceCard scanned={invoice.scanned_data} />
```

**Step 3:** Commit.

```bash
git add src/components/invoices/OcrConfidenceCard.tsx src/app/invoices/[id]/review/page.tsx
git commit -m "feat(ocr): confidence card por campo en review"
```

---

## Fase 10 — Migración + limpieza

### Task 10.1: Resolver inconsistencia `file_url` vs `image_url`

`docs/ai/05-invoices.md` documenta que algunos sitios usan `file_url` y otros `image_url`. Canonizar a **`file_url`**.

**Step 1:** Buscar usos:

```bash
grep -rn "image_url" src/ migrations/ supabase/
grep -rn "file_url" src/
```

**Step 2:** Si la columna real en DB es `image_url`, crear migración para renombrar:

```sql
-- migrations/2026XXXX_rename_image_url.sql
ALTER TABLE invoices RENAME COLUMN image_url TO file_url;
```

Si ya es `file_url`, actualizar los lugares que usan `image_url` para usar `file_url`.

**Step 3:** Regenerar tipos Supabase:

```bash
npx supabase gen types typescript --project-id <PROJECT_ID> > src/types/supabase.ts
```

(O método equivalente al que ya uses.)

**Step 4:** Commit.

```bash
git add migrations/ src/ supabase/
git commit -m "fix(invoices): canonizar file_url en lugar de image_url"
```

### Task 10.2: Validación server-side de tamaño y MIME

Añadir guard en `processInvoiceFromExtraction` (validar `fileMime` y opcionalmente verificar el archivo en Storage). Aunque el cliente valida, no es suficiente — un atacante puede llamar la action saltándose la UI.

**Step 1:** En `processInvoiceFromExtraction`, después de validar el schema:

```ts
const ACCEPTED_MIMES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
if (!ACCEPTED_MIMES.includes(parsed.fileMime)) {
  return { success: false, error: 'Tipo de archivo no soportado' }
}
```

**Step 2:** Opcionalmente, leer metadata del objeto en Storage para verificar tamaño real:

```ts
const { data: meta } = await supabase.storage.from('invoices').list(
  parsed.filePath.split('/').slice(0, -1).join('/'),
  { search: parsed.filePath.split('/').pop() }
)
const size = meta?.[0]?.metadata?.size
if (size && size > 10 * 1024 * 1024) {
  await supabase.storage.from('invoices').remove([parsed.filePath])
  return { success: false, error: 'Archivo demasiado grande' }
}
```

**Step 3:** Commit.

```bash
git add src/app/actions/invoices.ts
git commit -m "fix(ocr): validación server-side de MIME y tamaño"
```

### Task 10.3: Test E2E ligero

**Files:**
- Create: `e2e/ocr-invoice-flow.spec.ts`

**Step 1:** Test playwright simple — subir 3 archivos sample, confirmar que llegan a `/invoices/[id]/review`.

Coloca samples en `e2e/fixtures/`:
- `sample-digital.pdf` (PDF con texto nativo).
- `sample-scanned.pdf` (PDF escaneado).
- `sample-image.jpg` (foto de factura).

```ts
import { test, expect } from '@playwright/test'

test.describe('OCR invoice flow', () => {
  test('PDF digital → review con items', async ({ page }) => {
    // login y navegar a /invoices ...
    await page.setInputFiles('input[type="file"]', 'e2e/fixtures/sample-digital.pdf')
    await expect(page.getByText('Analizando')).toBeVisible()
    await expect(page.getByText('Listo', { exact: false })).toBeVisible({ timeout: 60000 })
  })
})
```

**Step 2:** Commit.

```bash
git add e2e/ocr-invoice-flow.spec.ts e2e/fixtures/
git commit -m "test(ocr): e2e ligero del flujo de subida"
```

---

## Fase 11 — Actualización de `docs/ai/`

### Task 11.1: Actualizar `docs/ai/05-invoices.md`

Per la regla en `CLAUDE.md`, **obligatorio** actualizar el archivo de la página tras tocar el módulo.

**Files:**
- Modify: `docs/ai/05-invoices.md`

**Step 1:** Cambios concretos:

1. **Sección 3 (Flujo técnico de datos):**
   - Reemplazar el flujo `processInvoice` viejo por el nuevo `processInvoiceFromExtraction`.
   - Añadir el pipeline cliente: `extractDocumentText` cascada.
   - Reflejar que `scanned_data` ahora incluye `_meta.source` y `_meta.used_fallback`.

2. **Sección 5 (Dependencias):**
   - Añadir `src/lib/ocr/*` (nuevo paquete).
   - Añadir `src/lib/similarity.ts`.
   - Reemplazar referencia a `src/services/openai-vision.ts` por `src/services/openai-invoice.ts`.
   - Mencionar dependencias `pdfjs-dist` y `tesseract.js`.

3. **Sección 6 (Casos límite):**
   - Quitar la mención a `file_url` vs `image_url` (resuelto).
   - Añadir: "Cuando OpenAI cae, se usa parser local — items quedan vacíos, el usuario los introduce a mano."
   - Añadir: "PDF escaneado mal renderizado: scale 2.5 mitiga, pero documentos con resolución muy baja pueden seguir fallando."

4. **Sección 7 (Al añadir/modificar):**
   - Añadir bullet sobre actualizar el prompt de extracción si cambia el formato de `master_ingredients`.
   - Añadir mención de tests requeridos.

**Step 2:** Commit.

```bash
git add docs/ai/05-invoices.md
git commit -m "docs(ai): actualizar 05-invoices.md con flujo OCR híbrido"
```

### Task 11.2: Actualizar `docs/ai/T01-arquitectura.md`

Añadir `pdfjs-dist` y `tesseract.js` al stack.

```bash
git add docs/ai/T01-arquitectura.md
git commit -m "docs(ai): añadir pdfjs y tesseract al stack en T01"
```

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|------------|
| Bundle size del cliente crece mucho (Tesseract es ~1MB) | Alta | Dynamic import: tesseract solo carga si hace falta. PDFs digitales no lo invocan. |
| pdfjs worker no se encuentra en producción | Media | Postinstall lo copia a `public/`. Verificar en build de Vercel que `public/pdf.worker.min.mjs` existe. |
| GPT-4o devuelve JSON inválido con items raros | Media | `ScannedInvoiceSchema.parse()` valida. Si falla, caer a parser local. |
| El usuario sube facturas en formato no probado | Media | Aceptar PDF + JPG/PNG/WebP. Otros tipos → error con mensaje claro. |
| Tesseract en móvil: lento | Alta | Aviso explícito al usuario ("Analizando…"). Procesado en serie, no en paralelo. |
| Texto extraído pero el modelo no encuentra items | Media | `items: []` es válido en el schema. El usuario los introduce a mano en la review. |
| Coste OpenAI mayor de lo esperado | Baja | Texto-first reduce ~70%. Monitorizar `_meta.source` en `scanned_data` para ver % de cada path. |

---

## Plan de testing manual antes de mergear

1. **PDF digital típico** (ej. factura Makro): tiene texto nativo, debería entrar por `pdf-native`. Comprobar que no consume crédito si OpenAI vía texto es gratis (o si consume, que es coste de tokens texto, no vision).
2. **PDF escaneado** (factura del proveedor del pueblo): debería caer en `pdf-tesseract`.
3. **Foto JPG de un albarán**: directamente `image-tesseract`.
4. **Archivo con OpenAI caído** (apagar API key temporalmente): debe usar `parseInvoiceLocally`, status llega a `review_required`, badge "IA no disponible" visible.
5. **PDF de 5 páginas**: solo se leen las 3 primeras (limitación documentada).
6. **PDF cifrado / con contraseña**: debe fallar con mensaje claro (no bloqueo en blanco).
7. **Líneas con IVA mixto** (10% y 21%): comprobar que `items[].tax_rate` aparece correctamente.
8. **Doble click en "Procesar"**: idempotency_key debería evitar duplicados — verificar.

---

## Comandos de verificación final

```bash
# Types limpio
npm run typecheck

# Lint limpio
npm run lint

# Tests pasan
npm test

# Build OK
npm run build

# Worker existe en public/
ls public/pdf.worker.min.mjs

# Sin referencias a openai-vision
grep -r "openai-vision" src/ && echo "FAIL" || echo "OK"

# Sin referencias a image_url (si canonizamos a file_url)
grep -rn "image_url" src/ migrations/
```

Todos deben pasar antes de mergear.
