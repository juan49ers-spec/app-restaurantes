# Prompt para revisión externa con Claude

Copia este prompt en Claude para que revise el trabajo completo y dé visto bueno o señale errores.

```text
Actúa como revisor senior de producto, arquitectura y código para una app SaaS de gestión de restaurantes.

Contexto del repo:
- Proyecto Next.js/React/TypeScript con Supabase.
- La documentación obligatoria para agentes está en docs/ai/.
- La app busca ser una herramienta de gestión para restaurantes que permita generar informes profesionales sin inventar datos ni introducir deuda crítica.

Objetivo de la revisión:
Revisa todo lo implementado en las fases de Reporting profesional y Menu Engineering. Quiero que des visto bueno solo si el trabajo es coherente, robusto y no deja errores importantes. Si ves fallos, contradicciones, deuda técnica o riesgos, señálalos con claridad y con prioridad.

Documentos que debes leer primero:
1. docs/ai/README.md
2. docs/ai/implementation-summary-reporting-menu-engineering.md
3. docs/ai/T11-reporting-profesional.md
4. docs/ai/19-reports.md
5. docs/ai/09-menu-engineering.md
6. docs/ai/T04-financial-math.md
7. docs/ai/T06-server-actions-comunes.md
8. docs/ai/phase-1-reporting-cierre.md
9. docs/ai/phase-2-reporting-cierre.md
10. docs/ai/phase-3-reporting-cierre.md
11. docs/ai/phase-4-reporting-cierre.md
12. docs/ai/phase-5-reporting-cierre.md
13. docs/ai/phase-6-reporting-cierre.md
14. docs/ai/phase-6-5-reporting-consolidacion.md
15. docs/ai/phase-7-menu-engineering-cierre.md

Código principal a revisar:
- src/lib/reporting/
- src/app/actions/professional-reporting.ts
- src/app/reports/
- src/components/reports/
- src/app/actions/seed-professional-report-demo.ts
- src/app/api/seed-reporting-demo/route.ts
- src/lib/menu-engineering.ts
- src/app/actions/menu-engineering.ts
- src/components/menu-engineering/MenuEngineeringContext.tsx
- src/types/schema.ts
- supabase/migrations/20260525153000_create_professional_report_drafts.sql
- tests/reporting/
- tests/components/ProfessionalReportReview.test.tsx
- tests/unit/menu-engineering-lib.test.ts
- tests/unit/menu-engineering-action.test.ts

Puntos críticos que quiero que compruebes:
1. Multi-tenancy:
   - Ningún flujo operativo debe aceptar restaurant_id desde cliente.
   - Las server actions deben resolver restaurante en servidor.
   - El historial y los snapshots de informes deben filtrar por restaurante activo.

2. Reporting profesional:
   - El motor de reporting debe ser puro y no consultar Supabase.
   - Las métricas deben tener fuente/evidencia/calidad.
   - No debe inventar conclusiones cuando faltan datos.
   - Las secciones PARTIAL/MISSING/CONFLICT deben ser honestas.
   - La exportación debe consumir snapshot guardado, no estado local sin persistir.

3. Persistencia:
   - professional_report_drafts debe versionar correctamente.
   - No debe haber riesgo obvio de sobrescribir snapshots históricos.
   - Las narrativas editables deben quedar asociadas al snapshot correcto.

4. Seed demo:
   - Debe estar bloqueado en producción salvo override explícito.
   - No debe aceptar restaurant_id desde cliente.
   - La limpieza de datos demo no debe borrar datos reales.

5. Menu Engineering:
   - Debe existir una sola fórmula BCG.
   - calculateMenuEngineeringAnalysis() debe ser la fuente única.
   - calculateMatrix y el simulador cliente deben usar la misma fórmula.
   - avg_popularity debe ser coherente con la UI como decimal.
   - No debe quedar rastro funcional del umbral antiguo expectedMix * 0.7.

6. Calidad técnica:
   - Revisa duplicaciones peligrosas.
   - Revisa nombres engañosos.
   - Revisa tests insuficientes.
   - Revisa fallos de atomicidad o estados parciales.
   - Revisa problemas de build, lint o TypeScript que se puedan intuir por código.

Resultado que quiero:
- Primero lista hallazgos por severidad: Crítico, Alto, Medio, Bajo.
- Cada hallazgo debe incluir archivo y función/componente afectado.
- Si no ves hallazgos críticos, dilo explícitamente.
- Después da una valoración general: Aprobado / Aprobado con reservas / No aprobado.
- Finalmente recomienda el siguiente paso de desarrollo.

No des una respuesta complaciente. Si algo no está claro, dilo. Si algo parece correcto, explica por qué.
```
