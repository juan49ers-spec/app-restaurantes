# Cierre Fase 6.5 — Consolidacion reporting profesional

## Que hemos conseguido

Esta fase no añade una metrica nueva. Consolida la base para poder seguir con Menu Engineering sin construir sobre un informe dificil de verificar.

Se ha añadido:

1. Dataset demo completo y determinista para informes.
2. Endpoint interno `/api/seed-reporting-demo` para preparar el caso completo en dev/staging.
3. Tests de server action de reporting.
4. Pulido visual de la exportacion imprimible.
5. Documentacion sincronizada del flujo demo y sus limites.

## Dataset demo

La action `seedProfessionalReportDemoData()` crea datos para febrero 2026:

- ventas diarias;
- gastos operativos;
- objetivo mensual si no existe;
- empleados;
- turnos;
- proveedores;
- facturas completadas;
- recetas;
- ventas por receta.

La action no acepta `restaurant_id`. Resuelve el restaurante activo en servidor con `getUserRestaurant()`.

## Seguridad de la seed

La seed solo funciona fuera de produccion, salvo `ALLOW_REPORTING_DEMO_SEED=true`.

Al resembrar, borra solo filas marcadas como demo mediante `source`, `idempotency_key`, emails `reporting-demo-*` o nombres `[Demo Informe]`. Las ventas por receta solo se limpian cuando pertenecen a recetas demo. No debe borrar datos reales.

## Tests añadidos

`tests/reporting/professional-reporting-action.test.ts` cubre:

1. Carga server-side de todas las fuentes del informe.
2. Uso de `restaurant_id` resuelto en servidor.
3. Error limpio en periodos invalidos.
4. No consultar Supabase si no hay restaurante activo.

## Exportacion

La vista `/reports/print/[draftId]` mantiene HTML imprimible, pero ahora tiene:

- portada con jerarquia mas fuerte;
- KPIs ejecutivos con mayor presencia;
- capitulos mas claros;
- metricas en formato tabla para lectura profesional;
- estado de calidad traducido a lenguaje de cliente.

## Siguiente paso recomendado

Fase 7: unificar Menu Engineering.

Antes de llevar cuadrantes STAR/PLOWHORSE/PUZZLE/DOG al informe profesional hay que resolver la diferencia entre:

- `src/lib/menu-engineering.ts`;
- `src/app/actions/menu-engineering.ts`.

Una vez unificado, el informe podra elevar la lectura de carta desde ranking descriptivo a diagnostico estrategico de mix.
