# Cierre Fase 7 — Menu Engineering

## Qué hemos conseguido

Hemos cerrado una inconsistencia importante: antes habia dos reglas distintas para clasificar platos en la matriz BCG. La libreria usaba el promedio real del menu y la action usaba un umbral rebajado al 70%, lo que podia convertir platos frontera en `STAR` cuando debian ser `PUZZLE` o `PLOWHORSE`.

Ahora hay una sola formula compartida en `src/lib/menu-engineering.ts`:

- Popularidad: `popularity_pct >= 1 / numero_de_items`.
- Margen: `contribution_margin >= margen_medio_ponderado`.
- Clasificacion: `STAR`, `PLOWHORSE`, `PUZZLE` o `DOG` segun esos dos ejes.

## Cambios principales

- Se ha creado `calculateMenuEngineeringAnalysis()` como motor puro y reutilizable.
- `calculateMatrix()` ya no duplica la formula: usa el motor compartido.
- El simulador cliente tambien usa el mismo motor, por lo que la simulacion y el calculo guardado hablan el mismo idioma.
- `avg_popularity` queda definido como decimal (`1 / N`). Por ejemplo, en un menu de 4 platos el umbral es `0.25`, mostrado en UI como `25%`.
- La actualizacion de items calculados pasa a un `upsert` masivo por `id`, incluyendo las columnas obligatorias del snapshot, y se valida el error antes de marcar el reporte como analizado.

## Por qué importa

Esto reduce deuda tecnica real. A partir de ahora, si en una fase futura decidimos llevar los cuadrantes BCG al informe profesional, no partimos de una clasificacion ambigua.

Tambien evita que el usuario vea resultados distintos entre:

- El informe guardado.
- La matriz visual.
- La simulacion what-if.

## Verificacion

- Prueba de libreria para detectar el caso frontera entre 25% y 17,5%.
- Prueba de server action para confirmar que `calculateMatrix()` persiste la misma clasificacion.
- Typecheck ejecutado correctamente.

## Siguiente paso recomendado

La siguiente fase ya puede decidir con seguridad si los cuadrantes BCG entran en el informe profesional o si primero se mejora la experiencia visual/explicativa de Menu Engineering para que el cliente entienda mejor cada recomendacion.
