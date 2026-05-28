# Prompt para Codex — Fase 14.2: QA visual y flujo cliente completo

## Contexto del proyecto

App SaaS de finanzas para restaurantes (Next.js 15 / Supabase / TypeScript).
El consultor prepara informes profesionales y los entrega a su restaurante cliente mediante un portal web.

### Lo que ya existe y está aprobado

- Portal Premium v2 con portada ejecutiva, KPIs, capítulos, comparativa mensual, tendencia 3 meses, desglose de gastos por categoría, acciones sugeridas, histórico con badges de estado (Nuevo/Leído/Reunión solicitada/En preparación/Revisado).
- PDF imprimible con portada, índice, resumen ejecutivo, KPIs, conclusiones, plan de revisión, capítulos, métricas, narrativas, incidencias y anexo de calidad.
- Solicitud de reunión con anti-duplicado.
- Seed demo determinista para febrero 2026 (`seed-professional-report-demo.ts`).
- 462 tests verdes, build limpio, deploy en main.

## Objetivo de esta fase

**NO construir funcionalidad nueva.** Esta fase verifica visualmente que el portal, el PDF y el flujo completo se ven y funcionan correctamente. Si se encuentran bugs visuales o de UX, se corrigen. Si todo está bien, se documenta el resultado.

La verificación se hace con **Playwright** tomando screenshots en múltiples breakpoints y verificando que las páginas renderizan contenido real (no estados vacíos ni errores).

## Prerequisito: datos demo publicados

Para que el portal tenga contenido que verificar, la fase necesita un informe publicado con datos reales. El flujo es:

1. Ejecutar el seed demo (si no se ha ejecutado ya) para poblar datos de febrero 2026.
2. Generar un informe desde `/reports?from=2026-02-01&to=2026-02-28`.
3. Guardar como READY.
4. Publicar en portal.

**Si el seed demo ya fue ejecutado y hay un informe publicado**, saltar este paso. Si no, crear un script de setup E2E que lo haga programáticamente via server actions antes de las verificaciones visuales.

## Tests E2E a escribir

Archivo: `tests/e2e/portal-visual-qa.spec.ts` (Playwright).

### Configuración

```typescript
import { test, expect } from '@playwright/test'

// Breakpoints a verificar
const BREAKPOINTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'wide', width: 1440, height: 900 },
]
```

### Test 1: Portal home renderiza contenido

Para cada breakpoint:
1. Navegar a `/portal`.
2. Verificar que la página NO muestra "Tu consultor aún no ha publicado ningún informe" (estado vacío).
3. Verificar que existe un `h1` visible con texto que incluya "Informe" o el nombre del restaurante.
4. Verificar que hay al menos 1 KPI visible (buscar elementos con clases `tabular-nums` o números con formato `€`).
5. Verificar que existe la sección "Histórico de informes publicados".
6. Tomar screenshot: `portal-home-{breakpoint}.png`.
7. Verificar que no hay overflow horizontal (`document.documentElement.scrollWidth <= window.innerWidth`).

### Test 2: Portal detalle renderiza informe completo

Para cada breakpoint:
1. Navegar a `/portal`, encontrar el link "Ver informe completo" o "Ver informe" y hacer click.
2. Verificar que la página tiene:
   - Brief ejecutivo con conclusión principal visible.
   - Al menos 3 KPIs.
   - Sección "Conclusiones ejecutivas".
   - Al menos 1 capítulo con métricas.
   - Sidebar con "Capítulos del informe" (en desktop/wide, debajo en mobile/tablet).
   - Sección "Solicitar reunión de revisión".
   - Calidad del informe con porcentaje.
3. Si existe, verificar que "Tendencia de 3 meses" muestra tabla con al menos 1 fila.
4. Si existe, verificar que "Desglose de gastos" muestra tabla con al menos 1 categoría.
5. Tomar screenshot: `portal-detail-{breakpoint}.png`.
6. Verificar que no hay overflow horizontal.

### Test 3: PDF imprimible renderiza documento completo

1. Navegar al link PDF del informe publicado (`/reports/print/{draftId}`).
2. Verificar que la página tiene:
   - Portada con nombre del restaurante y periodo.
   - Sección "Resumen ejecutivo" con KPIs.
   - Sección "Índice" con al menos 1 capítulo.
   - Sección "Conclusiones ejecutivas".
   - Sección "Plan de revisión recomendado" con prioridades.
   - Al menos 1 capítulo con métricas y narrativa.
   - Sección "Anexo de calidad de dato" con estado global y confianza.
3. Tomar screenshot a 1280x900: `portal-pdf-print.png`.
4. Verificar que no hay elementos con texto "undefined", "null", "NaN" o "Sin dato" en KPIs principales (algún "Sin dato" en métricas secundarias es aceptable).

### Test 4: Solicitud de reunión funciona

1. Navegar al detalle del informe.
2. Encontrar el textarea "Mensaje opcional para tu consultor".
3. Escribir "Quiero revisar los gastos del mes".
4. Click en "Solicitar reunión".
5. Verificar que el botón cambia a "Solicitud registrada" o muestra texto de confirmación.
6. Verificar que el textarea queda deshabilitado.
7. Tomar screenshot: `portal-meeting-requested.png`.

### Test 5: Histórico muestra badge de estado correcto

1. Navegar a `/portal`.
2. Encontrar la sección "Histórico de informes publicados".
3. Verificar que al menos 1 informe tiene un badge visible (Nuevo, Leído, Reunión solicitada, etc.).
4. Verificar que cada badge tiene un icono (Sparkles, Eye, Clock3, CheckCircle2).
5. Tomar screenshot: `portal-history-badges.png`.

### Test 6: Navegación portal funciona

1. Navegar a `/portal`.
2. Verificar que el header muestra el nombre del consultor o "Portal cliente".
3. Verificar que existe link "Inicio" que apunta a `/portal`.
4. Verificar que existe link "Volver a ControlHub".
5. Verificar que el footer muestra el año actual.
6. Navegar al detalle → verificar que se carga sin error.
7. Volver al portal home → verificar que se carga sin error.

## Verificaciones de calidad visual (NO automatizables, documentar resultado)

Después de los tests E2E, revisar manualmente los screenshots y documentar en un archivo `docs/ai/phase-14-2-qa-visual-results.md`:

### Checklist visual

- [ ] **Jerarquía**: la lectura principal destaca sobre los KPIs secundarios.
- [ ] **Números**: los KPIs usan tamaño generoso y son legibles a primera vista.
- [ ] **Contraste**: las secciones critical/warning tienen color de fondo distinguible.
- [ ] **Ritmo**: no todo tiene el mismo espaciado — la portada respira, los capítulos son más compactos.
- [ ] **Sombras**: las cards principales tienen sombra sutil (`shadow-sm`).
- [ ] **Hover**: los links y botones tienen hover state visible.
- [ ] **Responsive**: en mobile, las grids colapsan a 1 columna sin overflow.
- [ ] **PDF**: la portada ocupa la primera página completa, cada capítulo empieza en página nueva.
- [ ] **Badges**: los estados del histórico son distinguibles por color e icono.
- [ ] **Fondo**: el portal usa `bg-stone-50`, distinto del backoffice.
- [ ] **Footer**: el footer muestra consultor + restaurante + año.

### Formato del resultado

```markdown
# QA Visual — Fase 14.2

## Fecha: YYYY-MM-DD

## Screenshots tomados
- portal-home-mobile.png ✅/❌ (observaciones)
- portal-home-tablet.png ✅/❌
- portal-home-desktop.png ✅/❌
- portal-home-wide.png ✅/❌
- portal-detail-mobile.png ✅/❌
- portal-detail-tablet.png ✅/❌
- portal-detail-desktop.png ✅/❌
- portal-detail-wide.png ✅/❌
- portal-pdf-print.png ✅/❌
- portal-meeting-requested.png ✅/❌
- portal-history-badges.png ✅/❌

## Checklist visual
(marcar cada item)

## Bugs encontrados
(listar si hay)

## Fixes aplicados
(listar commits de fix si hay)
```

## Reglas técnicas obligatorias

1. **No añadir funcionalidad nueva.** Solo tests E2E, screenshots y fixes visuales menores.
2. **Fixes visuales permitidos**: ajustes de spacing, font-size, colores, sombras, overflow, responsive. No cambiar lógica de datos, actions ni motor de reporting.
3. **Sin `console.log`** en ningún archivo.
4. **Screenshots**: guardarlos en `tests/e2e/screenshots/` (añadir al `.gitignore` si no están ya).
5. **Playwright config**: si no existe `playwright.config.ts`, crear uno mínimo que apunte a `http://localhost:3000` con los 4 breakpoints.
6. **No romper tests existentes**: los 462 tests unitarios/integración deben seguir pasando.
7. **Si el seed demo no está disponible**: los tests E2E pueden marcarse como `test.skip` con comentario explicando que necesitan datos demo. No deben fallar en CI sin datos.

## Commits esperados

- `test: add portal visual QA e2e tests` — tests Playwright con screenshots.
- `docs: add phase 14.2 visual QA results` — documento de resultados.
- Si hay fixes: `fix: <descripción del fix visual>` como commits separados.

## Archivos clave a leer antes de empezar

- `src/app/portal/page.tsx` — home del portal.
- `src/app/portal/reports/[id]/page.tsx` — detalle del informe.
- `src/app/portal/layout.tsx` — layout con header/footer.
- `src/components/portal/*.tsx` — todos los componentes del portal.
- `src/components/reports/ProfessionalReportPrintDocument.tsx` — documento imprimible (369 líneas).
- `src/app/reports/print/[draftId]/page.tsx` — página de impresión.
- `src/app/actions/seed-professional-report-demo.ts` — seed demo para febrero 2026.
- `tests/qa/full-delivery-flow.test.ts` — referencia de cómo se mockean las actions.

## Nota importante

El valor de esta fase no es "pasar tests verdes" — es **ver el portal con ojos de cliente** y decidir si transmite profesionalidad. Los screenshots son la evidencia. Si algo se ve genérico, plano o confuso, documentarlo como bug visual y proponer un fix concreto.
