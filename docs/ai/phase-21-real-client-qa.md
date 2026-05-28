# Cierre Fase 21 — QA real del flujo cliente

## 1. Objetivo

Dejar una verificación repetible para comprobar el flujo completo consultor -> cliente antes de enseñar la app a un restaurante real.

Esta fase no añade funcionalidad de producto. Cierra una necesidad operativa: poder ejecutar una prueba clara del recorrido de entrega, desde datos e informe hasta portal, PDF, solicitud de reunión y seguimiento del consultor.

## 2. Qué se ha añadido

- Script `npm run qa:client-flow`, implementado con Node nativo para no añadir dependencias.
- Verificación determinista del flujo completo con Vitest:
  - importación de datos;
  - checklist del consultor;
  - generación, guardado y publicación del informe;
  - portal cliente;
  - `viewed_at`;
  - solicitud de reunión;
  - anti-duplicado;
  - cierre de seguimiento;
  - despublicación.
- Verificaciones específicas de portal, consultor, cartera y componentes visibles de entrega.
- Modo opcional de QA visual con Playwright:
  - `RUN_VISUAL_QA=true npm run qa:client-flow`;
  - `QA_BASE_URL=https://app-finanzas-restaurante.vercel.app RUN_VISUAL_QA=true npm run qa:client-flow`.

## 3. Flujo técnico de datos

El script vive en `scripts/cli/qa-client-flow.mjs` y ejecuta pruebas ya existentes que cubren los contratos reales del sistema.

No consulta directamente Supabase ni introduce credenciales nuevas. Las pruebas deterministas mockean Supabase como el resto de la suite. La QA visual usa `tests/e2e/portal-visual-qa.spec.ts`, que puede trabajar contra local o contra una URL real usando `QA_BASE_URL`.

## 4. Reglas de negocio verificadas

- `restaurant_id` no viaja desde cliente en las actions críticas.
- El portal solo muestra informes publicados.
- El detalle publicado marca `viewed_at`.
- La solicitud de reunión no crea duplicados cuando ya existe una abierta.
- El consultor ve el estado actualizado de la entrega.
- Despublicar oculta el informe del portal.
- La cartera multi-cliente se mantiene bajo validación server-side.

## 5. Dependencias e implicaciones cruzadas

Esta fase cruza:

- `/consultant`;
- `/reports`;
- `/portal`;
- importadores CSV;
- `professional_report_drafts`;
- `portal_meeting_requests`;
- `consultant_restaurants`.

Por eso el comando de QA no sustituye a `npm run verify`; lo complementa como prueba de recorrido comercial.

## 6. Casos límite y uso recomendado

- Si no hay datos reales publicados, la QA visual puede saltarse pruebas con `test.skip`. Esto es correcto: la QA visual necesita un informe publicado.
- Para una demo comercial, primero preparar/publicar un informe real o demo y después ejecutar:

```bash
QA_BASE_URL=https://app-finanzas-restaurante.vercel.app RUN_VISUAL_QA=true npm run qa:client-flow
```

- Si el comando determinista falla, no avanzar a una demo cliente hasta corregirlo.

## 7. Siguiente paso

La siguiente fase natural es Fase 22: onboarding comercial del consultor, para reducir la fricción al crear un restaurante cliente nuevo y llevarlo hasta su primer informe.
