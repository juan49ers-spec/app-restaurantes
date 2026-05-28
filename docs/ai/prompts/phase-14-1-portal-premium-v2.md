# Prompt para Codex — Fase 14.1: Portal Premium v2

## Contexto del proyecto

App SaaS de finanzas para restaurantes (Next.js 15 / Supabase / TypeScript).
El consultor prepara informes profesionales y los entrega al restaurante cliente mediante un portal web en `/portal`.

### Estado actual del portal

El portal ya funciona end-to-end (verificado con QA en `tests/qa/full-delivery-flow.test.ts`). Tiene:

- **Layout** (`src/app/portal/layout.tsx`): header con logo/nombre consultor, nav mínimo, footer.
- **Home** (`src/app/portal/page.tsx`): portada ejecutiva, 4 KPIs, dato vivo, comparativa mensual, acciones sugeridas, histórico.
- **Detalle** (`src/app/portal/reports/[id]/page.tsx`): brief ejecutivo, KPIs completos, conclusiones, comparativa, capítulos con métricas, sidebar con navegación + reunión + calidad.
- **Componentes**: `PortalExecutiveBrief`, `PortalChapterSection`, `PortalChapterNavigation`, `PortalPeriodComparisonPanel`, `PortalSuggestedActions`, `PortalReportSummary`, `PortalMeetingRequestDialog`.
- **Motor puro**: `src/lib/portal-insights.ts` (comparativa, acciones sugeridas), `src/lib/reporting/consultant-briefing.ts`.
- **Actions**: `src/app/actions/portal.ts` (publish, unpublish, getPublished, requestMeeting).

### Lo que NO tiene el portal (y esta fase debe añadir)

El portal actual es funcional pero **visualmente básico**: todo es `slate-200/white/rounded-lg` con poco carácter. La Fase 14.1 debe convertirlo en una experiencia premium que el consultor pueda enseñar con orgullo.

## Objetivo de esta fase

Mejorar la experiencia visual y funcional del portal cliente en 5 ejes:

### 1. Mejor experiencia visual del portal

**NO se trata de cambiar el sistema de diseño entero** — se trata de que el portal tenga carácter propio, profesional y premium, distinto del backoffice operativo.

Directrices concretas:

- **Portada (home)**: la portada debe sentirse como la primera página de un informe de consultoría, no como un dashboard genérico. Añadir jerarquía visual real entre la lectura principal, los KPIs y las acciones.
- **Detalle del informe**: los capítulos deben tener ritmo visual — no todos iguales. El primer capítulo (ventas/costes) puede ser más prominente. Las métricas dentro de cada sección deben tener más presencia (números grandes, unidades claras).
- **Tono visual**: fondo del portal ligeramente diferente al blanco puro (ej. `slate-50` o un `stone-50` cálido). Cards con sombras sutiles reales (`shadow-sm` como mínimo). Bordes más suaves. Transiciones hover en links y cards.
- **Tipografía**: los títulos principales del portal pueden usar un peso más fuerte (`font-bold` en vez de `font-semibold`) y tracking tighter. Los subtítulos deben diferenciarse claramente de los cuerpos de texto.
- **Iconos con propósito**: los iconos de cada capítulo/sección deben ser semánticos (ej. TrendingUp para ventas, Wallet para costes, Users para personal), no decorativos genéricos.
- **Espaciado con ritmo**: no todo con `gap-6`. La portada ejecutiva puede tener más aire. Las secciones interiores pueden estar más compactas.

**Archivos a modificar**: `PortalExecutiveBrief.tsx`, `PortalChapterSection.tsx`, `PortalChapterNavigation.tsx`, `PortalPeriodComparisonPanel.tsx`, `PortalSuggestedActions.tsx`, `PortalReportSummary.tsx`, `src/app/portal/page.tsx`, `src/app/portal/reports/[id]/page.tsx`, `src/app/portal/layout.tsx`.

### 2. Mejor portada ejecutiva

El `PortalExecutiveBrief` actual funciona pero puede mejorar:

- Mostrar el **periodo** más prominente (ej. "Mayo 2026" grande, no solo como label pequeño).
- Mostrar el **nombre del restaurante** en la portada, no solo en el layout.
- El bloque lateral oscuro (`bg-slate-950`) está bien como concepto, pero las KPIs dentro necesitan más jerarquía — el número principal debe ser más grande, la nota explicativa más clara.
- El badge "Informe publicado" debería tener un tono más premium (no `variant="outline"` genérico).
- Si hay conclusiones `critical`, la portada debe transmitir urgencia visual sin alarmar.

**Archivo**: `src/components/portal/PortalExecutiveBrief.tsx`.

### 3. Comparativa multi-periodo (nuevo)

Actualmente `buildPortalPeriodComparison` compara el periodo publicado con el mes anterior. Ampliar para que el portal pueda mostrar la evolución de **hasta 3 meses** si hay datos históricos.

**Motor puro** (nuevo archivo `src/lib/portal-insights.ts` — extender):

```typescript
export interface PortalMultiPeriodTrend {
  periods: Array<{
    from: string
    to: string
    label: string // "Mar 2026", "Abr 2026", "May 2026"
    revenue: number
    expenses: number
    netResult: number
  }>
  hasTrend: boolean // true si hay al menos 2 periodos con datos
}

export function buildPortalMultiPeriodTrend(input: {
  currentFrom: string
  currentTo: string
  monthlyData: Array<{
    from: string
    to: string
    revenue: number
    expenses: number
  }>
}): PortalMultiPeriodTrend
```

**Action** (extender `src/lib/portal.ts`):

- `getPortalMultiPeriodTrendForRestaurant({ restaurantId, periodFrom, periodTo })` — carga `daily_sales` y `operating_expenses` para el periodo publicado y los 2 meses anteriores. Agrupa por mes. Devuelve `PortalMultiPeriodTrend`.

**Componente** (nuevo `src/components/portal/PortalMultiPeriodTrend.tsx`):

- Muestra una tabla/grid con los 3 meses y sus métricas (ventas, gastos, resultado).
- Flechas o colores indicando tendencia (subiendo/bajando).
- Si solo hay 1 mes, muestra "Sin tendencia histórica".
- No usar chart library externa — una tabla bien diseñada con indicadores visuales es suficiente.

**Integración**: añadir `PortalMultiPeriodTrend` en la página de detalle (`/portal/reports/[id]/page.tsx`), debajo de la comparativa mensual existente. La comparativa mensual existente NO se elimina — la multi-periodo la complementa con contexto de tendencia más amplio.

### 4. Drill-down por categoría de gasto (nuevo)

Actualmente la comparativa muestra "Gastos" como un total. El cliente debería poder ver **qué categorías de gasto crecieron o bajaron**.

**Motor puro** (extender `src/lib/portal-insights.ts`):

```typescript
export interface PortalExpenseCategoryBreakdown {
  categories: Array<{
    category: string
    label: string // nombre legible en español
    currentAmount: number
    previousAmount: number
    delta: PortalMetricDelta
  }>
  hasPreviousData: boolean
}

export function buildPortalExpenseCategoryBreakdown(input: {
  currentExpenses: Array<{ category: string; amount: number }>
  previousExpenses: Array<{ category: string; amount: number }>
}): PortalExpenseCategoryBreakdown
```

**Action** (extender `src/lib/portal.ts`):

- `getPortalExpenseBreakdownForRestaurant({ restaurantId, periodFrom, periodTo })` — carga `operating_expenses` del periodo actual y anterior, agrupa por categoría, devuelve `PortalExpenseCategoryBreakdown`.

**Componente** (nuevo `src/components/portal/PortalExpenseBreakdown.tsx`):

- Tabla de categorías con columnas: categoría, mes actual, mes anterior, delta (€ y %).
- Filas ordenadas por delta absoluto descendente (las categorías que más cambiaron primero).
- Colores semánticos: gasto que sube = rojo, que baja = verde (lowerIsBetter).
- Si no hay datos del mes anterior, mostrar solo el desglose actual sin deltas.

**Labels de categoría**: ya existen en el código (`EXPENSE_GROUPS` en `src/types/schema.ts`). Importar y mapear `category → label` legible.

**Integración**: añadir en la página de detalle, debajo de la comparativa. Puede ir dentro de un acordeón o como sección expandible para no alargar demasiado la página.

### 5. Estados claros de revisión/reunión en el histórico

El `PortalReportSummary` actual muestra:
- "Versión X · Publicado DD/MM/YYYY"
- "Visto DD/MM/YYYY" o "Pendiente de lectura"
- Badge con status genérico

Mejorar para que el cliente entienda el **estado del ciclo de entrega**:

- Si el informe no ha sido visto: badge `Nuevo` con tono `info` (azul).
- Si ha sido visto pero no hay reunión solicitada: badge `Leído` con tono `neutral`.
- Si hay reunión `PENDING`: badge `Reunión solicitada` con tono `warning` (ámbar).
- Si hay reunión `ACKNOWLEDGED`: badge `Reunión en preparación` con tono `info`.
- Si hay reunión `COMPLETED`: badge `Revisado` con tono `positive` (verde).

**Datos necesarios**: `PortalReportSummary` ya recibe `report: PublishedReportSummary`. Ese tipo necesita extenderse para incluir `meetingStatus: 'PENDING' | 'ACKNOWLEDGED' | 'COMPLETED' | null`. La action `getPublishedReports()` debe hacer un left join o una query separada a `portal_meeting_requests` para traer el estado de reunión más reciente de cada informe.

**Archivos a modificar**: `src/app/actions/portal.ts` (extender `getPublishedReports`), `src/components/portal/PortalReportSummary.tsx`.

## Reglas técnicas obligatorias

1. **`restaurant_id` NUNCA viaja desde cliente.** Todas las actions y helpers usan `getUserRestaurant()` o reciben `restaurantId` desde servidor.
2. **Motor puro**: las funciones nuevas en `portal-insights.ts` no importan Supabase ni componentes React.
3. **Inmutabilidad**: no mutar objetos ni arrays. Usar spread y `.map()`.
4. **Sin `any`**: tipar todo. Importar tipos existentes de `src/lib/reporting/types.ts` y `src/lib/portal-insights.ts`.
5. **Sin `console.log`** en código de producción.
6. **Componentes sin `React.FC`**: props con interface tipada + function component.
7. **Archivos < 400 líneas**: si un componente crece mucho, extraer sub-componentes.
8. **No romper lo existente**: la comparativa mensual actual (`PortalPeriodComparisonPanel`) sigue funcionando tal cual. Las nuevas features son aditivas.
9. **Labels en español**: toda la UI del portal es en español. Los labels de categoría de gasto deben usar los nombres legibles, no las constantes técnicas.

## Tests obligatorios

### Lógica pura
- `tests/portal/portal-multi-period.test.ts`: test de `buildPortalMultiPeriodTrend` con 3 meses, 2 meses, 1 mes y 0 meses.
- `tests/portal/portal-expense-breakdown.test.ts`: test de `buildPortalExpenseCategoryBreakdown` con categorías que suben/bajan, mes anterior vacío, y categoría nueva sin histórico.

### Componentes
- `tests/components/PortalMultiPeriodTrend.test.tsx`: renderiza 3 periodos, muestra "Sin tendencia" con 1.
- `tests/components/PortalExpenseBreakdown.test.tsx`: renderiza tabla, colores semánticos, caso sin histórico.
- `tests/components/PortalReportSummary.test.tsx`: renderiza cada estado de reunión con el badge correcto.

### Action
- `tests/portal/portal-expense-breakdown-action.test.ts`: verifica que la action devuelve breakdown correcto con scope `restaurant_id`.
- `tests/portal/portal-multi-period-action.test.ts`: verifica que la action devuelve trend con scope `restaurant_id`.

## Verificación final

1. `npm test` — todos los tests pasan (existentes + nuevos).
2. `npm run verify` — typecheck + lint:strict + test + build.
3. Verificar visualmente que `/portal` y `/portal/reports/[id]` renderizan correctamente con datos del seed demo si está disponible.

## Commits esperados

- `feat: add portal multi-period trend` — motor puro + action + componente + tests.
- `feat: add portal expense category breakdown` — motor puro + action + componente + tests.
- `feat: add delivery status badges to portal history` — extend action + componente + test.
- `feat: upgrade portal visual experience` — mejoras visuales en portada, detalle, layout, componentes existentes. Commit separado porque es solo UI.

## Archivos clave a leer antes de empezar

- `docs/ai/20-portal-cliente.md` — contrato completo del portal.
- `docs/ai/T11-reporting-profesional.md` — contrato del informe y presentación.
- `src/lib/portal-insights.ts` — motor puro actual (comparativa, acciones).
- `src/lib/portal.ts` — helpers server-side del portal.
- `src/app/actions/portal.ts` — actions del portal.
- `src/components/portal/*.tsx` — todos los componentes actuales del portal.
- `src/app/portal/page.tsx` — home del portal.
- `src/app/portal/reports/[id]/page.tsx` — detalle del informe.
- `src/app/portal/layout.tsx` — layout del portal.
- `src/components/portal/format.ts` — helpers de formateo.
- `src/types/schema.ts` — buscar `EXPENSE_GROUPS` o constantes de categoría de gasto.
- `tests/` — estudiar patrones de mock existentes antes de escribir mocks nuevos.

## Nota sobre diseño visual

El portal es la cara visible del consultor ante su cliente. No debe parecer un dashboard interno más. Debe sentirse como un **informe profesional interactivo** — limpio, con jerarquía clara, tipografía con peso, números que destaquen y espaciado que respire.

Evitar:
- Cards todas iguales sin jerarquía.
- Grises uniformes sin contraste.
- Bordes sin sombra ni profundidad.
- Texto del mismo tamaño para títulos, subtítulos y cuerpo.

Buscar:
- Contraste entre la lectura principal (grande, bold) y los detalles (pequeño, light).
- Sombras sutiles que den profundidad a las cards principales.
- Un color de acento que marque los elementos interactivos (links, botones, badges activos).
- Hover states que confirmen interactividad.
- Números financieros con tamaño generoso y fuente monospace o tabular para alineación.
