# QA Visual — Fase 14.2

## Fecha: 2026-05-28

## Screenshots tomados

- `tests/e2e/screenshots/portal-home-mobile.png` ✅
- `tests/e2e/screenshots/portal-home-tablet.png` ✅
- `tests/e2e/screenshots/portal-home-desktop.png` ✅
- `tests/e2e/screenshots/portal-home-wide.png` ✅
- `tests/e2e/screenshots/portal-detail-mobile.png` ✅
- `tests/e2e/screenshots/portal-detail-tablet.png` ✅
- `tests/e2e/screenshots/portal-detail-desktop.png` ✅
- `tests/e2e/screenshots/portal-detail-wide.png` ✅
- `tests/e2e/screenshots/portal-pdf-print.png` ✅
- `tests/e2e/screenshots/portal-meeting-requested.png` ✅
- `tests/e2e/screenshots/portal-history-badges.png` ✅

## Checklist visual

- ✅ Jerarquía: la lectura principal destaca sobre los KPIs secundarios.
- ✅ Números: los KPIs usan tamaño generoso y son legibles a primera vista.
- ✅ Contraste: las secciones warning/critical usan fondos y bordes distinguibles.
- ✅ Ritmo: la portada respira más que los capítulos, que son más compactos.
- ✅ Sombras: las cards principales tienen profundidad sutil.
- ✅ Hover: los enlaces y cards del histórico tienen estados hover visibles.
- ✅ Responsive: mobile colapsa a una columna y Playwright verifica que no hay overflow horizontal.
- ✅ PDF: la vista imprimible renderiza portada, resumen, índice, capítulos y anexo de calidad.
- ✅ Badges: el histórico muestra estados distinguibles por color e icono.
- ✅ Fondo: el portal usa un fondo claro diferenciado del backoffice operativo.
- ✅ Footer: el footer muestra portal, restaurante, ControlHub y año.

## Bugs encontrados

1. Overflow horizontal en mobile dentro del detalle del informe.
   - Causa 1: las tablas de tendencia multi-periodo y desglose de gastos tenían anchuras mínimas fijas.
   - Causa 2: la navegación de capítulos no limitaba correctamente el ancho de sus links dentro del aside en mobile.
2. La solicitud de reunión se insertaba correctamente, pero el cliente no veía confirmación estable.
   - Causa: tras la petición, el árbol cliente podía remontarse y perder el estado local del componente.
3. El test de PDF hacía click en un enlace que abre en nueva pestaña y seguía validando la página original.
   - Causa: el test no navegaba explícitamente al `href` imprimible.

## Fixes aplicados

- `PortalMultiPeriodTrend` y `PortalExpenseBreakdown` renderizan cards específicas en mobile y mantienen tabla en tablet/desktop.
- `PortalChapterNavigation` usa `min-w-0` y `grid-cols-[minmax(0,1fr)]` para evitar que sus links desborden.
- La página de detalle añade `min-w-0` a las columnas principales.
- `PortalMeetingRequestDialog` usa una API route (`POST /api/portal/meeting-request`) y conserva la confirmación por informe en `sessionStorage`.
- `requestConsultantMeetingForRestaurant()` centraliza la lógica compartida de solicitud de reunión para server action y API route.
- El test E2E del PDF navega directamente al `href` de impresión.

## Verificación

- `npx vitest run tests/components/PortalMeetingRequestDialog.test.tsx tests/portal/portal-actions.test.ts` ✅
- `npx vitest run tests/components/PortalMultiPeriodTrend.test.tsx tests/components/PortalExpenseBreakdown.test.tsx` ✅
- `npx playwright test tests/e2e/portal-visual-qa.spec.ts --project=chromium` ✅ 12/12
