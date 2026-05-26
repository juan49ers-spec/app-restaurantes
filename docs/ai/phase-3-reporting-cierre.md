# Cierre Fase 3 — Reporting profesional

## Que hemos conseguido

La Fase 3 convierte la mesa de revision en un flujo usable de versionado y exportacion.

Ahora el usuario puede:

1. Generar un borrador profesional en `/reports`.
2. Revisar y editar la narrativa de cada seccion.
3. Guardar una version trazable del informe.
4. Ver el historial de versiones del periodo.
5. Abrir una version guardada en `/reports/print/[draftId]`.
6. Imprimir o guardar PDF desde el navegador.

## Decision tecnica importante

El cliente no envia calculos financieros para guardar.

Cuando se pulsa "Guardar version", el servidor vuelve a generar el informe desde Supabase y guarda ese snapshot. Solo se aceptan las narrativas editadas como overrides. Esto evita guardar metricas manipuladas desde frontend.

## Base de datos

Se ha creado `professional_report_drafts` con:

- `restaurant_id`
- periodo (`period_from`, `period_to`)
- `version`
- `status`
- `schema_version`
- `report_snapshot`
- `narrative_overrides`
- `exported_at`
- timestamps

Tambien se han creado indices, trigger de `updated_at`, restriccion unica por version y politicas RLS por restaurante propietario.

## Codigo principal

- `src/app/actions/professional-reporting.ts`
- `src/components/reports/ProfessionalReportReview.tsx`
- `src/components/reports/PrintReportButton.tsx`
- `src/app/reports/page.tsx`
- `src/app/reports/print/[draftId]/page.tsx`
- `supabase/migrations/20260525153000_create_professional_report_drafts.sql`

## Verificacion realizada en esta fase

- Migracion aplicada a la base enlazada con `supabase db query --linked --file ...`.
- Confirmacion de que `professional_report_drafts` responde desde la conexion de la app.
- `npm run typecheck` ejecutado correctamente durante la fase.
- Test focal `npm test -- ProfessionalReportReview` ejecutado correctamente.

## Siguiente paso recomendado

La siguiente fase debe mejorar la calidad del contenido final:

1. Plantillas narrativas mas cercanas al informe de cliente.
2. Comparativas contra objetivo mensual.
3. Anexo de fuentes mas completo.
4. Exportacion PDF server-side si el cliente necesita descarga directa sin dialogo del navegador.
