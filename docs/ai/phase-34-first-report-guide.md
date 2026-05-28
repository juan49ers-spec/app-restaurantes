# Cierre Fase 34 — Primer informe guiado

## Objetivo

Ayudar al consultor a entender el siguiente paso real para entregar el primer informe de un cliente sin automatizar publicación ni saltarse la revisión profesional.

## Cambios aplicados

- Añadida la función pura `buildFirstReportGuide()` en `src/lib/consultant/first-report-guide.ts`.
- Añadidos tipos explícitos para el recorrido: estados, pasos y acción principal.
- Añadido `FirstReportGuidePanel` en `/consultant` con cuatro etapas: datos base, versión `READY`, quality gate y portal cliente.
- Integrado el panel después de la checklist de preparación y antes del flujo de entrega.

## Reglas de seguridad y negocio

- No se añade ninguna mutación.
- `restaurant_id` no viaja desde cliente.
- El panel no publica informes. Si toca publicar, enlaza a `/reports?from=...&to=...` para mantener el quality gate y el versionado como fuente de verdad.
- Si hay bloqueos de datos o quality gate, el panel prioriza resolverlos antes de mostrar acciones de entrega.

## Tests

- `tests/consultant/first-report-guide.test.ts` cubre las cinco transiciones: datos bloqueados, crear `READY`, quality gate bloqueado, publicar desde reports y portal ya listo.
- `tests/components/FirstReportGuidePanel.test.tsx` cubre renderizado de acción principal y pasos accesibles.

## Resultado

El consultor ve una guía clara para llegar al primer informe publicado sin duplicar reglas en React ni abrir atajos inseguros alrededor de `/reports`.
