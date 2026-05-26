# Informe de cierre — Fase 2 Reporting profesional

Fecha de cierre: 2026-05-25

## Objetivo

Convertir el motor de Fase 1 en una pantalla real de producto para revisar informes profesionales antes de exportarlos.

La fase se centra en revision, calidad del dato y narrativa editable. No incluye exportacion PDF ni persistencia de versiones.

## Que se ha conseguido

1. Se ha creado la ruta `/reports`.

   La pagina carga el restaurante activo, propone un periodo por defecto y genera un borrador con `getProfessionalReportDraft(period)`.

2. Se ha incorporado la ruta al menu principal.

   `Informes` aparece en CORE junto a Control Financiero y Facturas.

3. Se ha construido una mesa de revision profesional.

   La UI muestra estado global, confianza, bloqueos criticos, fuentes declaradas, resumen ejecutivo y secciones del informe.

4. Se han anadido tabs por seccion.

   Ventas, Costes, Personal, Proveedores, Rentabilidad, Recomendaciones y Anexo se revisan de forma separada.

5. Se ha hecho visible la calidad del dato.

   Cada seccion muestra estado, confianza, incidencias, metricas, fuentes y evidencias. La pantalla no oculta datos faltantes ni conflictos.

6. Se ha anadido narrativa editable en memoria local.

   El usuario puede ajustar el texto de cada bloque antes de una futura exportacion. En esta fase no se persiste para no introducir una tabla/versionado sin diseno completo.

7. Se ha corregido el gate de typecheck.

   Se ha creado `tsconfig.typecheck.json` para que el typecheck no dependa de `.next/dev`, porque Next 16 puede modificar `tsconfig.json` durante build.

## Archivos principales

- `src/app/reports/page.tsx`
- `src/components/reports/ProfessionalReportReview.tsx`
- `src/config/navigation.ts`
- `tests/components/ProfessionalReportReview.test.tsx`
- `docs/ai/19-reports.md`
- `tsconfig.typecheck.json`

## Verificacion realizada

Comandos ejecutados con resultado correcto:

- `npm test` — 26 archivos, 291 tests pasados.
- `npm run typecheck` — TypeScript sin errores.
- `npx eslint --max-warnings=0` — lint sin warnings.
- `npm run build` — build de produccion correcto.
- `npm run build && npm run typecheck` — correcto, cubriendo el caso posterior al build.

Verificacion navegador:

- `http://localhost:3000/reports` abre correctamente.
- Login real con `flyderapp@gmail.com`.
- Menu `Informes` visible.
- Pantalla `Mesa de revision` visible.
- Sin errores de consola en desktop.
- Sin errores de consola en mobile tras hidratacion.

## Decisiones tecnicas importantes

- `/reports` es una ruta propia, no una pestana dentro de `/financial-control`.
- La UI consume `ProfessionalRestaurantReport`; no recalcula metricas.
- No hay boton de exportacion falso. La exportacion queda para una fase donde funcione de verdad.
- La narrativa editable no se persiste todavia para evitar una tabla de borradores mal definida.
- El typecheck usa una configuracion estable separada de la que Next puede modificar.

## Riesgo restante

No queda ningun fallo conocido en gates ni en navegador.

Lo que aun no existe queda fuera de esta fase: persistencia de revisiones, historial de versiones y exportacion PDF/HTML final.

## Siguiente paso recomendado

Fase 3: persistir borradores/versiones de informe y preparar exportacion real.

Debe incluir:

- Modelo de datos para borradores.
- Guardado de narrativa editada por seccion.
- Estados del informe: borrador, revisado, listo para exportar.
- Export HTML/PDF consumiendo `ProfessionalRestaurantReport`.
- Tests de permisos para que un restaurante no pueda ver informes de otro.
