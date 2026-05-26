# Cierre Fase 5 — Reporting profesional

## Que hemos conseguido

La Fase 5 hace que el informe empiece a comparar el rendimiento real contra referencias de gestion.

Ahora el informe incorpora:

1. Cumplimiento de objetivo de ventas si existe `monthly_targets`.
2. Desvio de materia prima contra objetivo.
3. Desvio de personal contra objetivo.
4. Dia de semana con mayor venta registrada.
5. Dia de semana con menor venta registrada.
6. Brecha porcentual entre dia fuerte y dia debil.
7. KPI ejecutivo de cumplimiento de objetivo cuando hay presupuesto configurado.
8. Conclusion ejecutiva especifica sobre objetivo de ventas.

## Decision tecnica importante

La comparativa contra objetivos se calcula en el motor puro de reporting.

La capa de presentacion solo decide como elevar esa lectura a KPI o conclusion. No consulta Supabase y no inventa objetivos.

## Limite consciente

No se ha añadido ranking de recetas/productos en esta fase.

Motivo: antes de convertirlo en informe profesional hay que asegurar el contrato de ventas por receta, coste por receta y cobertura de escandallos. Meterlo sin esa base seria vistoso, pero debil.

## Codigo principal

- `src/lib/reporting/build-professional-report.ts`
- `src/lib/reporting/professional-report-presentation.ts`
- `tests/reporting/professional-report.test.ts`
- `docs/ai/19-reports.md`
- `docs/ai/T11-reporting-profesional.md`

## Verificacion TDD

Se añadieron tests rojos primero para:

- comparativa contra objetivos mensuales;
- diagnostico por dia de semana;
- KPI ejecutivo de cumplimiento de objetivo.

Despues se implemento el minimo codigo necesario y los tests pasaron.

## Siguiente paso recomendado

La siguiente fase deberia preparar el modulo de producto/rentabilidad:

1. Definir contrato de datos para ventas por receta.
2. Cruzar ventas por receta con `recipes.current_cost`.
3. Detectar productos estrella, saludables y criticos.
4. Mostrar ranking con margen, PVP y coste.
5. No exportarlo si faltan escandallos o ventas por receta suficientes.
