# Cierre Fase 6 — Reporting profesional

## Que hemos conseguido

La Fase 6 incorpora una primera lectura profesional de carta sin convertirla todavia en una matriz BCG cerrada.

Ahora el informe puede mostrar:

1. Recetas con venta registrada.
2. Unidades vendidas por receta.
3. Venta estimada desde `quantity_sold * selling_price`.
4. Coste estimado desde `quantity_sold * current_cost`.
5. Margen bruto estimado de carta.
6. Cobertura de ventas por receta contra ventas diarias.
7. Producto que mas margen bruto aporta.
8. Producto mas vendido.
9. Producto vendido con menor margen porcentual.

## Decision tecnica importante

La seccion nueva se llama `menu_performance` y se alimenta de `daily_recipe_sales` + `recipes`.

No usa la clasificacion de Menu Engineering porque hay una diferencia previa entre la formula documentada en libreria y la formula persistida por la action `calculateMatrix`. Para no introducir deuda tecnica, reporting solo hace ranking descriptivo trazable.

## Limite consciente

Si no hay ventas por receta, la seccion queda `PARTIAL` con aviso, pero no bloquea todo el informe como fallo critico.

Motivo: un restaurante puede tener ventas y gastos suficientes para leer rentabilidad general aunque todavia no tenga capturado el mix de platos.

## Codigo principal

- `src/lib/reporting/types.ts`
- `src/lib/reporting/source-map.ts`
- `src/lib/reporting/build-professional-report.ts`
- `src/lib/reporting/professional-report-presentation.ts`
- `src/app/actions/professional-reporting.ts`
- `src/components/reports/ProfessionalReportReview.tsx`
- `tests/reporting/professional-report.test.ts`

## Verificacion TDD

Se añadieron tests rojos primero para:

- generar ranking de carta desde ventas por receta y coste/PVP de receta;
- garantizar que la falta de ventas por receta no se convierte en bloqueo critico del informe completo.

Despues se implemento el contrato y el test focal paso correctamente.

## Siguiente paso recomendado

La siguiente fase deberia cerrar la deuda funcional de Menu Engineering antes de reutilizar sus cuadrantes en informes:

1. Unificar la formula entre `src/lib/menu-engineering.ts` y `src/app/actions/menu-engineering.ts`.
2. Decidir si el umbral de popularidad sera promedio de cantidad o `expectedMix * 0.7`.
3. Cubrirlo con tests unitarios y de action.
4. Solo despues elevar STAR/PLOWHORSE/PUZZLE/DOG al informe profesional.
