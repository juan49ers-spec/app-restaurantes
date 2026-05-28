# Prompt para Codex — Fase 14.3: Hardening técnico

## Contexto del proyecto

App SaaS de finanzas para restaurantes (Next.js 15 / Supabase / TypeScript).
Tras las fases 14.0 (QA funcional), 14.1 (Portal Premium v2) y 14.2 (QA visual), la app tiene 462+ tests verdes y build limpio. Esta fase es de limpieza técnica pura: no se añade funcionalidad nueva.

## Objetivo de esta fase

Resolver deuda técnica acumulada en 5 ejes concretos:

1. **Reemplazar `console.error/log/warn`** por el logger estructurado que ya existe.
2. **Dividir archivos que superan las 800 líneas.**
3. **Limpiar imports duplicados y código legacy.**
4. **Eliminar el único `as any` del código de aplicación.**
5. **Corregir import fuera de lugar.**

**La regla de oro: no cambiar comportamiento.** El output de cada función debe ser idéntico antes y después. Los 462+ tests existentes deben seguir pasando sin modificar sus assertions.

---

## Eje 1: Reemplazar console.* por logger (70 instancias en 21 archivos)

### Logger existente

El proyecto ya tiene un logger profesional con Pino en `src/lib/logger.ts`:

```typescript
import { createActionLogger } from '@/lib/logger'

const log = createActionLogger('nombreDeLaAction')
log.info('mensaje', { contexto })
log.error('mensaje', { err: error, contexto })
log.warn('mensaje', { contexto })
```

### Reglas de reemplazo

| Patrón actual | Reemplazo |
|---|---|
| `console.error("Error ...", error)` | `log.error("...", { err: error })` |
| `console.error("Error ...", error.message)` | `log.error("...", { err: error })` (Pino serializa automáticamente) |
| `console.log("...", data)` | `log.info("...", { ...data relevante })` |
| `console.warn("...")` | `log.warn("...")` |
| `console.error` en catch sin variable | `log.error("...", { err: error })` (añadir el parámetro `error` al catch) |

### Archivos a procesar (ordenados por cantidad de ocurrencias)

| Archivo | Ocurrencias | Notas |
|---|---|---|
| `src/app/actions/staff.ts` | 15 | Se divide primero (Eje 2), luego reemplazar |
| `src/app/actions/admin.ts` | 10 | Archivo admin, puede tener logs de auditoría — usar `log.info` para los operacionales |
| `src/app/actions/financial-control.ts` | 5 | Se divide primero (Eje 2), luego reemplazar |
| `src/app/actions/admin-queries.ts` | 5 | |
| `src/app/actions/alerts.ts` | 4 | También limpiar import duplicado (Eje 3) |
| `src/app/actions/resultados.ts` | 4 | |
| `src/app/actions/seed-shifts-robust.ts` | 4 | Seed file — OK usar `log.debug` |
| `src/app/actions/broadcasts.ts` | 3 | |
| `src/app/actions/ingredients.ts` | 3 | |
| `src/app/actions/seed-financial-data.ts` | 3 | Seed file |
| `src/app/actions/billing-config.ts` | 2 | |
| `src/app/actions/invoices.ts` | 2 | |
| `src/app/actions/staff-optimization.ts` | 2 | |
| `src/app/actions/admin-billing.ts` | 1 | |
| `src/app/actions/billing.ts` | 1 | |
| `src/app/actions/recipes.ts` | 1 | |
| `src/app/actions/review-invoice.ts` | 1 | |
| `src/app/actions/seed-sales-robust.ts` | 1 | Seed file |
| `src/app/actions/staff-actions.ts` | 1 | |
| `src/app/actions/stock-actions.ts` | 1 | |
| `src/app/actions/validation.ts` | 1 | |

### Patrón de aplicación por archivo

```typescript
// ANTES
'use server'
import { createClient } from '@/lib/supabaseServer'
// ... otros imports

export async function miAction() {
  try {
    // ... lógica
  } catch (error) {
    console.error("Error en miAction:", error)
    return { success: false, error: 'Mensaje' }
  }
}

// DESPUÉS
'use server'
import { createClient } from '@/lib/supabaseServer'
import { createActionLogger } from '@/lib/logger'
// ... otros imports

const log = createActionLogger('miAction')

export async function miAction() {
  try {
    // ... lógica
  } catch (error) {
    log.error('Error en miAction', { err: error })
    return { success: false, error: 'Mensaje' }
  }
}
```

**Si un archivo tiene múltiples actions exportadas**, crear un logger por cada una o uno general por archivo si todas son del mismo dominio:

```typescript
// Opción A: Logger por dominio (preferida si todas las actions son del mismo módulo)
const log = createActionLogger('staff')

// Opción B: Logger por action (si el archivo es heterogéneo)
export async function createShift() {
  const log = createActionLogger('createShift')
  // ...
}
```

---

## Eje 2: Dividir archivos grandes

### 2A: `financial-control.ts` (1199 líneas → 3 archivos)

Analizar las funciones exportadas y dividir por dominio funcional:

| Archivo nuevo | Contenido esperado |
|---|---|
| `src/app/actions/financial-control.ts` | Actions principales: CRUD de ventas diarias, gastos operativos, targets mensuales. Máximo ~400 líneas. |
| `src/app/actions/financial-import.ts` | Todo lo relacionado con CSV: `importFinancialCsv`, `previewFinancialCsv`, `preflightFinancialCsv`, schemas de validación CSV, tipos de payload. |
| `src/app/actions/financial-analysis.ts` | Análisis e insights: `getFinancialHistory`, `getFinancialInsights`, `getExpenseBreakdown`, funciones que leen datos agregados sin mutar. |

**Pasos:**
1. Leer el archivo completo y listar todas las funciones exportadas.
2. Clasificar cada función en uno de los 3 grupos.
3. Mover funciones manteniendo imports correctos.
4. Los imports compartidos (schemas Zod, tipos, constantes) se importan desde sus ubicaciones originales en cada archivo nuevo.
5. Si hay funciones internas helper usadas por múltiples grupos, moverlas a un archivo de utilidad existente (`src/lib/financial-utils.ts`) o dejarlas en el archivo principal y reexportarlas.
6. **Verificar que `npm run build` compila limpio tras la división.**
7. Buscar todos los imports de `@/app/actions/financial-control` en el proyecto y actualizarlos al archivo correcto.

### 2B: `staff.ts` (839 líneas → 2 archivos)

| Archivo nuevo | Contenido esperado |
|---|---|
| `src/app/actions/staff.ts` | CRUD de empleados, turnos, asistencia. Máximo ~450 líneas. |
| `src/app/actions/staff-scheduling.ts` | Planificación, conflictos de horario, proyecciones de coste laboral, optimización de turnos. |

**Nota:** ya existe `staff-actions.ts` y `staff-optimization.ts`. Verificar que no haya solapamiento antes de crear archivos nuevos. Si las funciones ya están allí, mover desde `staff.ts` hacia esos archivos existentes en lugar de crear nuevos.

**Pasos:** Mismos que 2A. Buscar imports de `@/app/actions/staff` en todo el proyecto y actualizar.

---

## Eje 3: Limpiar imports y código legacy

### 3A: `alerts.ts` — Import duplicado

```typescript
// ACTUAL (líneas 3-4)
import { createClient } from '@/lib/supabaseServer'
import { createClient as createSupabaseClient } from '@/lib/supabaseServer'

// CORRECTO
import { createClient } from '@/lib/supabaseServer'
```

Después de eliminar el alias duplicado, buscar todas las referencias a `createSupabaseClient` en el archivo y reemplazarlas por `createClient`.

### 3B: `notifications/page.tsx` — Import fuera de lugar

```typescript
// ACTUAL: línea 95 tiene un import DESPUÉS del componente
import { NotificationHistory } from "@/components/alerts/NotificationHistory"

// CORRECTO: mover a la zona de imports (líneas 1-6)
```

Mover el import a la parte superior del archivo, junto con los demás imports.

---

## Eje 4: Eliminar `as any`

### `src/lib/export-utils.ts` línea 343

```typescript
// ACTUAL
const pageCount = (doc as any).internal?.getNumberOfPages?.() || 1

// CORRECTO: Crear una interfaz mínima para el tipo
interface JsPdfWithInternals {
  internal?: {
    getNumberOfPages?: () => number
  }
}
const pageCount = (doc as JsPdfWithInternals).internal?.getNumberOfPages?.() || 1
```

Si jsPDF ya exporta un tipo que incluya `internal`, usarlo directamente en lugar de crear uno nuevo. Verificar con los tipos de `jspdf` (`@types/jspdf` o los tipos incluidos en el paquete).

---

## Eje 5: Verificación cruzada de stock-actions.ts (722 líneas)

`stock-actions.ts` está en 722 líneas — aún dentro del límite de 800, pero monitorizar. **No dividir** en esta fase, solo:
1. Reemplazar el 1 `console.*` que tiene.
2. Verificar que no hay imports duplicados.

---

## Orden de ejecución recomendado

1. **Dividir `financial-control.ts`** (Eje 2A) — primero porque afecta muchos imports.
2. **Dividir `staff.ts`** (Eje 2B).
3. **Reemplazar console.*** en todos los archivos (Eje 1) — después de dividir, porque los archivos ya están en su forma final.
4. **Limpiar alerts.ts y notifications/page.tsx** (Eje 3).
5. **Eliminar `as any`** (Eje 4).
6. **Build + tests finales.**

## Reglas técnicas obligatorias

1. **No cambiar ningún comportamiento.** Ni valores de retorno, ni tipos públicos, ni firmas de función. Solo mover código y reemplazar logging.
2. **Los 462+ tests deben pasar sin modificar assertions.** Si un test usa `console.error` en un spy/mock, actualizar el mock para espiar `logger.error` en su lugar — o dejarlo como está si el test no depende de ello.
3. **Sin `console.log`** en ningún archivo después de esta fase (excepto `src/lib/logger.ts` internamente).
4. **Cada archivo resultante debe tener menos de 800 líneas.**
5. **No romper imports en otros archivos.** Buscar con grep todos los consumers de cada módulo dividido.
6. **`npm run build` debe compilar limpio** después de cada eje.
7. **`npm test` debe pasar verde** al final.

## Commits esperados

1. `refactor: split financial-control.ts into domain-specific modules` — división de archivos + actualización de imports.
2. `refactor: split staff.ts into domain-specific modules` — idem.
3. `refactor: replace console.* with structured logger across all actions` — reemplazo masivo de logging.
4. `fix: clean duplicate import in alerts.ts and misplaced import in notifications` — limpieza menor.
5. `fix: replace as-any with typed assertion in export-utils` — type safety.

## Archivos clave a leer antes de empezar

- `src/lib/logger.ts` — logger existente (Pino). Usar `createActionLogger()`.
- `src/app/actions/financial-control.ts` — 1199 líneas, archivo más grande.
- `src/app/actions/staff.ts` — 839 líneas.
- `src/app/actions/staff-actions.ts` — verificar qué funciones ya están aquí.
- `src/app/actions/staff-optimization.ts` — verificar qué funciones ya están aquí.
- `src/app/actions/alerts.ts` — import duplicado en líneas 3-4.
- `src/app/notifications/page.tsx` — import en línea 95.
- `src/lib/export-utils.ts` — `as any` en línea 343.

## Verificación final

Después de todos los cambios:

```bash
# 1. Build limpio
npm run build

# 2. Tests verdes
npm test

# 3. Grep de validación — debe devolver 0 resultados
grep -r "console\.\(log\|error\|warn\)" src/app/actions/ --include="*.ts" | grep -v "// legacy-ok" | grep -v "test"

# 4. Verificar que no queden archivos > 800 líneas
wc -l src/app/actions/*.ts | sort -rn | head -5

# 5. Verificar que no quede ningún `as any`
grep -r "as any" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test."
```
