# Prompt Codex — Fase 10.3: Selector de periodo en la checklist del consultor

## Contexto del proyecto

App Next.js 15 (App Router) + Supabase + TypeScript para gestión financiera de restaurantes. Modelo consultor-first: el consultor usa el backoffice para cargar datos, preparar informes y publicarlos; el cliente restaurante solo ve el portal.

La ruta `/consultant` es la mesa interna del consultor. Incluye un dashboard con stats, una checklist de preparación de informes, un panel de solicitudes de reunión y un formulario de marca.

### Problema actual

La checklist de preparación (`PreparationChecklist`) está fijada al mes actual vía `currentMonthPeriod()` en `getConsultantWorkspace()`. El consultor no puede cambiar de mes. Los datos demo buenos están en febrero 2026, así que en mayo 2026 la checklist muestra todo vacío. Esto es técnicamente correcto pero inútil en la práctica.

### Objetivo

Que el consultor pueda navegar entre meses (◀ Febrero 2026 ▶) y la checklist se recalcule para el periodo seleccionado. La carga inicial sigue siendo el mes actual (server-rendered), y la navegación entre meses es client-side con una action dedicada.

---

## Reglas arquitectónicas obligatorias

1. **`restaurant_id` jamás viaja desde el cliente.** Siempre se resuelve server-side con `getUserRestaurant()`.
2. **Validación Zod** en toda action que reciba input.
3. **Inmutabilidad** en estado client: `setState(prev => ...)` con spread, nunca mutación directa.
4. **`'use server'`** en todo archivo de actions. `'use client'` solo en componentes interactivos.
5. **Fechas**: usar helpers de `src/lib/date-format.ts` con zona `Europe/Madrid` para evitar errores de hidratación.
6. **Tests**: patrón `MockQuery` existente en `tests/consultant/consultant-actions.test.ts`.
7. **Formato de respuesta**: `ActionResponse<T>` con `{ success, data?, error? }`.

---

## Archivos a modificar (5 archivos, ~120 líneas netas)

### 1. `src/app/actions/consultant.ts`

#### 1.1 Nuevo esquema Zod

```typescript
const ChecklistPeriodSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Formato YYYY-MM requerido.'),
})
```

#### 1.2 Extraer `periodFromMonth(month: string)` como función pura

Extrae la lógica de cálculo de `from`/`to` a partir de un `YYYY-MM`:

```typescript
function periodFromMonth(month: string): { month: string; from: string; to: string } {
  const [year, monthNumber] = month.split('-').map(Number)
  const to = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10)
  return { month, from: `${month}-01`, to }
}
```

Refactorizar `currentMonthPeriod()` para que use `periodFromMonth`:

```typescript
function currentMonthPeriod(now = new Date()) {
  const month = now.toISOString().slice(0, 7)
  return periodFromMonth(month)
}
```

#### 1.3 Nueva action: `getPreparationChecklistForPeriod`

```typescript
export async function getPreparationChecklistForPeriod(
  input: z.input<typeof ChecklistPeriodSchema>
): Promise<ActionResponse<ConsultantPreparationChecklist>>
```

Lógica:
1. Validar `input` con `ChecklistPeriodSchema.safeParse()`. Si falla → `{ success: false, error: 'Periodo inválido.' }`.
2. Resolver `restaurantId` con `getUserRestaurant()`. Si null → `{ success: false, error: 'No hay restaurante activo.' }`.
3. Calcular `period = periodFromMonth(parsed.data.month)`.
4. Ejecutar las **mismas 10 queries de conteo** que ya existen en `getConsultantWorkspace()` (líneas 303-314 del archivo actual), pero usando el periodo calculado en vez de `currentMonthPeriod()`.
5. Contar las solicitudes de reunión abiertas (sin filtro de fecha, son globales): `supabase.from('portal_meeting_requests').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).neq('status', 'COMPLETED')`.
6. Llamar a `buildPreparationChecklist(...)` con los conteos.
7. Devolver `{ success: true, data: checklist }`.

**Importante**: NO duplicar el bloque de queries. Extraer la lógica de conteo a una función interna `fetchChecklistCounts(supabase, restaurantId, period)` que devuelva los conteos. Usarla tanto en `getConsultantWorkspace()` como en `getPreparationChecklistForPeriod()`.

Firma sugerida para la función interna:

```typescript
async function fetchChecklistCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  restaurantId: string,
  period: { from: string; to: string }
): Promise<{
  salesCount: number
  expensesCount: number
  invoiceCount: number
  employeeCount: number
  shiftCount: number
  recipeCount: number
  recipeSalesCount: number
  menuEngineeringCount: number
  readyDraftCount: number
  publishedCount: number
  openRequestCount: number
  hasWarning: boolean
}>
```

Actualizar `getConsultantWorkspace()` para usar `fetchChecklistCounts()` internamente.

#### 1.4 Exportar `getPreparationChecklistForPeriod` y el tipo `ConsultantPreparationChecklist` (ya exportado)

---

### 2. `src/components/consultant/PreparationChecklist.tsx`

Convertir a componente client con selector de mes.

#### Cambios:

1. Añadir `'use client'` al inicio.
2. Añadir imports: `useState`, `useTransition` de React, `ChevronLeft`, `ChevronRight` de lucide-react, `getPreparationChecklistForPeriod` de la action.
3. Recibir props:
   ```typescript
   interface PreparationChecklistProps {
     initialChecklist: ConsultantPreparationChecklist
   }
   ```
   (antes recibía `checklist`, ahora `initialChecklist` para indicar que es el valor server-rendered).
4. Estado local:
   ```typescript
   const [checklist, setChecklist] = useState(initialChecklist)
   const [isPending, startTransition] = useTransition()
   ```
5. Funciones de navegación:
   ```typescript
   function navigateMonth(delta: -1 | 1) {
     const [year, month] = checklist.period.month.split('-').map(Number)
     const target = new Date(Date.UTC(year, month - 1 + delta, 1))
     const targetMonth = target.toISOString().slice(0, 7)
     startTransition(async () => {
       const response = await getPreparationChecklistForPeriod({ month: targetMonth })
       if (response.success && response.data) {
         setChecklist(response.data)
       }
     })
   }
   ```
6. En el header de la sección, reemplazar el título estático por:
   ```
   ◀  [Etiqueta del mes en español]  ▶
   ```
   Donde:
   - `◀` y `▶` son botones (`Button variant="ghost" size="icon"`) que llaman a `navigateMonth(-1)` y `navigateMonth(1)`.
   - La etiqueta del mes se formatea con `Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' })` a partir de `checklist.period.from`. Ejemplo: "febrero 2026". Primera letra en mayúscula.
   - Los botones se deshabilitan durante `isPending`.
   - El botón ▶ se deshabilita también si el mes actual ya es el mes mostrado (no puede navegar al futuro más allá del mes actual).

7. Durante carga (`isPending`), aplicar `opacity-60` al grid de ítems para indicar que se está actualizando, sin spinner ni skeleton.

8. Mantener toda la UI de ítems, badges e iconos **exactamente igual** a la actual.

#### Etiqueta del mes — ejemplo de formato:

```typescript
function formatMonthLabel(from: string): string {
  const date = new Date(`${from}T00:00:00.000Z`)
  const label = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}
```

---

### 3. `src/app/consultant/page.tsx`

Cambio mínimo: actualizar la prop del componente.

```diff
- <PreparationChecklist checklist={preparation} />
+ <PreparationChecklist initialChecklist={preparation} />
```

No cambiar nada más en esta página.

---

### 4. `tests/consultant/consultant-actions.test.ts`

Añadir 3 tests para `getPreparationChecklistForPeriod`:

#### Test 1: `loads preparation checklist for a specific month scoped to restaurant`

```typescript
it('loads preparation checklist for a specific month scoped to restaurant', async () => {
  const { getPreparationChecklistForPeriod } = await import('@/app/actions/consultant')

  const result = await getPreparationChecklistForPeriod({ month: '2026-02' })

  expect(result.success).toBe(true)
  expect(result.data?.period.month).toBe('2026-02')
  expect(result.data?.period.from).toBe('2026-02-01')
  expect(result.data?.period.to).toBe('2026-02-28')
  // Verify sales query scoped to restaurant and period
  const salesCall = calls.find(call => call.table === 'daily_sales' && call.head)
  expect(salesCall?.filters).toEqual(expect.arrayContaining([
    ['eq', 'restaurant_id', RESTAURANT_ID],
    ['gte', 'date', '2026-02-01'],
    ['lte', 'date', '2026-02-28'],
  ]))
  // Verify draft query scoped to exact period
  const draftCall = calls.find(call =>
    call.table === 'professional_report_drafts' &&
    call.head &&
    call.filters.some(f => f[0] === 'eq' && f[1] === 'period_from' && f[2] === '2026-02-01')
  )
  expect(draftCall).toBeDefined()
})
```

#### Test 2: `rejects invalid month format`

```typescript
it('rejects invalid month format for checklist period', async () => {
  const { getPreparationChecklistForPeriod } = await import('@/app/actions/consultant')

  const result = await getPreparationChecklistForPeriod({ month: 'invalid' })

  expect(result).toEqual({ success: false, error: 'Periodo inválido.' })
  expect(calls).toEqual([])
})
```

#### Test 3: `returns error when no restaurant for checklist period`

```typescript
it('returns error when no restaurant for checklist period', async () => {
  mockRestaurantId = null
  const { getPreparationChecklistForPeriod } = await import('@/app/actions/consultant')

  const result = await getPreparationChecklistForPeriod({ month: '2026-02' })

  expect(result).toEqual({ success: false, error: 'No hay restaurante activo.' })
  expect(calls).toEqual([])
})
```

---

### 5. `docs/ai/21-consultant-workspace.md`

Actualizar estas secciones:

#### Sección 1 (Propósito)
Sin cambios.

#### Sección 2 (Viaje del usuario)
Cambiar el punto 3:

```
3. Revisa la checklist del periodo que está preparando. Por defecto es el mes actual, pero puede navegar a meses anteriores con ◀/▶.
```

#### Sección 3 (Flujo técnico de datos)

Añadir en la parte de **Server actions**:

```
- `getPreparationChecklistForPeriod(input)` valida el mes con Zod (`YYYY-MM`), resuelve `restaurant_id` con `getUserRestaurant()`, calcula `from/to` del mes pedido y ejecuta las mismas queries de conteo que `getConsultantWorkspace()` pero para el periodo indicado. Devuelve `ConsultantPreparationChecklist`. Los conteos de checklist están extraídos a `fetchChecklistCounts()` para reutilización sin duplicación.
```

Añadir en la parte de **Client components**:

```
- `PreparationChecklist` es ahora un componente client. Recibe el checklist del mes actual como `initialChecklist` (server-rendered) y permite navegar entre meses con botones prev/next. Al cambiar mes, llama a `getPreparationChecklistForPeriod()` y actualiza estado local inmutablemente. No permite navegar más allá del mes actual.
```

#### Sección 4 (Reglas de negocio)

Añadir:

```
- La checklist se puede consultar para cualquier mes pasado o el actual. No se permite navegar al futuro más allá del mes actual.
- El periodo se calcula como mes natural: `from = YYYY-MM-01`, `to = último día del mes`.
```

#### Sección 6 (Casos límite)

Añadir:

```
- Si `getPreparationChecklistForPeriod` falla al cambiar de mes, el componente conserva el checklist anterior sin crashear.
- Si el consultor navega a un mes sin datos, todos los ítems marcan `Pendiente` — esto es correcto y esperado.
```

---

## Archivos clave de referencia (leer antes de implementar)

| Archivo | Por qué leerlo |
|---------|----------------|
| `src/app/actions/consultant.ts` | Código actual completo: esquemas Zod, tipos, `getConsultantWorkspace()`, `buildPreparationChecklist()`, `currentMonthPeriod()`, queries de conteo |
| `src/components/consultant/PreparationChecklist.tsx` | Componente actual que hay que convertir a client |
| `src/components/consultant/MeetingRequestsPanel.tsx` | Patrón de referencia para componente client con `useTransition` y actualización inmutable |
| `src/app/consultant/page.tsx` | Server page que pasa props al checklist |
| `tests/consultant/consultant-actions.test.ts` | MockQuery, patrón de tests existentes |
| `src/lib/date-format.ts` | Helpers de formato de fecha con timezone |
| `docs/ai/21-consultant-workspace.md` | Doc a actualizar |

---

## Lo que NO hacer

- **No tocar** `getConsultantWorkspace()` más allá de refactorizar la extracción de `fetchChecklistCounts()`. La firma, la respuesta y los tests existentes deben seguir pasando.
- **No tocar** `MeetingRequestsPanel`, `ConsultantBrandingForm`, ni ningún otro componente.
- **No tocar** el portal (`/portal`), el modelo de datos ni crear migraciones.
- **No añadir** dependencias nuevas. Usar solo lo que ya existe en el proyecto.
- **No usar** `searchParams` en la URL para el periodo. El estado de mes vive en el componente client. La razón: el periodo del checklist es estado transitorio de navegación, no estado compartible por URL.
- **No usar** `React.FC`. Usar funciones nombradas como en el resto del proyecto.
- **No usar** `console.log`. Usar el patrón de warnings/errores existente.

---

## Verificación

Después de implementar, ejecutar en este orden:

```bash
npx vitest run tests/consultant/
npx tsc --noEmit
npx next lint
npm run build
```

Los 9+ tests de consultant (6 existentes + 3 nuevos) deben pasar. El build debe completar sin errores.

---

## Resultado esperado

El consultor abre `/consultant` y ve la checklist del mes actual. Hace clic en ◀ y navega a abril 2026, luego a marzo, luego a febrero. Al llegar a febrero 2026, la checklist muestra los datos cargados del periodo demo (ventas, gastos, recetas, etc.). El botón ▶ está deshabilitado cuando llega al mes actual. Durante la transición entre meses, el grid de ítems baja su opacidad brevemente. No hay recarga de página completa.
