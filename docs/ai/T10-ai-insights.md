# T10 — AI Insights y Period Reports

**Archivos clave:** `src/app/actions/ai-insights.ts`
**Transversales relacionados:** [04-Financial Control](./04-financial-control.md), [T06](./T06-server-actions-comunes.md)

## 1. Propósito

Sistema de informes narrativos generados por IA para cada módulo y período. El usuario puede añadir notas de contexto ("este mes hubo obras en la calle"), un agente IA genera un borrador de análisis, y ambos se guardan para consulta.

## 2. Modelo de datos

Tabla `period_reports`, clave compuesta: `restaurant_id + module_name + period_key`.

| Columna | Tipo | Ejemplo |
|---------|------|---------|
| `restaurant_id` | UUID | FK → restaurants |
| `module_name` | TEXT | `"sales"`, `"expenses"`, `"staff"` |
| `period_key` | TEXT | `"2026-04"`, `"2026-Q1"` |
| `context_notes` | TEXT | Notas manuales del usuario |
| `ai_draft` | TEXT | Borrador generado por IA |
| `created_at` | TIMESTAMPTZ | Timestamp de creación |
| `updated_at` | TIMESTAMPTZ | Última actualización |

## 3. Server Actions

| Función | Descripción |
|---------|-------------|
| `getPeriodReport(restaurantId, moduleName, periodKey)` | Lee un registro de `period_reports`. Devuelve `PeriodReport \| null`. |
| `saveContextNotes(restaurantId, moduleName, periodKey, notes)` | Upsert del campo `context_notes`. Conflict target: `restaurant_id, module_name, period_key`. |
| `saveAiDraft(restaurantId, moduleName, periodKey, draft)` | Upsert del campo `ai_draft`. Misma lógica. |

## 4. Flujo de uso

1. El usuario abre un dashboard (ej: Financial Control, mes de abril).
2. Ve un campo "Notas de contexto" → escribe observaciones.
3. Click "Guardar notas" → `saveContextNotes()`.
4. Click "Generar análisis IA" → algún flujo externo genera texto → `saveAiDraft()`.
5. El borrador aparece en pantalla. El usuario puede editarlo y re-guardar.

## 5. Al modificar

- **Si se añade un módulo nuevo** que necesite insights: usar el mismo patrón `getPeriodReport(restaurantId, "nuevo_modulo", periodKey)`.
- **La generación de IA no está en este archivo** — `ai-insights.ts` solo persiste. La generación real puede estar en un endpoint API, edge function, o acción separada.
- **Revalidar:** la ruta del módulo que consume el reporte.
