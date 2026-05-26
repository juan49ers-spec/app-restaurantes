# Resumen consolidado — Reporting profesional y Menu Engineering

Fecha: 2026-05-26

## Objetivo general

Convertir la aplicación en una herramienta de gestión para restaurantes capaz de llegar a informes profesionales sin introducir deuda crítica, sin inventar datos y sin romper la separación entre restaurantes.

El foco no ha sido solo "sacar un PDF". El foco ha sido construir una base fiable: datos trazables, calidad explícita, snapshots, pruebas, exportación revisable y una fórmula de carta coherente.

## Principios que se han aplicado

- No aceptar `restaurant_id` desde cliente en flujos operativos.
- Separar motores puros de cálculo de las server actions.
- No inventar conclusiones cuando faltan datos.
- Mostrar calidad de dato por sección.
- Persistir snapshots versionados para exportar siempre una versión guardada.
- Resolver errores desde la raíz, especialmente cuando afectaban a datos o a confianza.
- Mantener `docs/ai/` sincronizado con el código tocado.

## Fase 1 — Motor de reporting profesional

Se creó `src/lib/reporting/` como motor puro para construir un borrador profesional desde datos ya cargados. El motor no consulta Supabase y no depende de sesión.

Logros principales:

- Contrato `ProfessionalRestaurantReport`.
- Mapa de fuentes con evidencia por sección.
- Métricas con unidad, fuente, tipo y calidad.
- Incidencias `OK`, `PARTIAL`, `MISSING` y `CONFLICT`.
- Server action `getProfessionalReportDraft(period)` con restaurante resuelto en servidor.
- Corrección fiscal: bases imponibles negativas se respetan como dato explícito.

## Fase 2 — Mesa de revisión de informes

Se añadió la ruta `/reports` para revisar el informe antes de exportarlo.

Logros principales:

- Selector de periodo.
- Vista de calidad global y por secciones.
- Métricas trazables.
- Narrativa editable por bloques.
- Integración en navegación.
- Tests de UI para la revisión y guardado.

## Fase 3 — Persistencia, versionado y exportación

Se creó la persistencia real de informes profesionales.

Logros principales:

- Tabla `professional_report_drafts`.
- Migración Supabase para snapshots.
- Guardado versionado.
- Historial por periodo.
- Ruta imprimible `/reports/print/[draftId]`.
- Exportación siempre basada en snapshot guardado, no en estado local.

## Fase 4 — Presentación ejecutiva

Se elevó el informe desde un borrador técnico a una estructura de entregable profesional.

Logros principales:

- Capa `professional-report-presentation`.
- Portada.
- KPIs ejecutivos.
- Capítulos.
- Conclusiones numeradas.
- Lectura más cercana a consultoría, manteniendo trazabilidad.

## Fase 5 — Objetivos y diagnóstico semanal

Se incorporaron comparativas contra objetivos mensuales y lectura por día de semana.

Logros principales:

- Comparativa de ingresos, materia prima y personal contra `monthly_targets`.
- Diagnóstico de venta por día de semana.
- Lectura condicionada a datos reales; no se inventan días sin registros.
- KPIs ejecutivos enriquecidos cuando hay objetivos configurados.

## Fase 6 — Carta dentro del informe profesional

Se añadió una sección descriptiva de carta (`menu_performance`) al informe profesional.

Logros principales:

- Lectura desde `daily_recipe_sales` y `recipes`.
- Unidades vendidas por receta.
- Venta estimada.
- Coste estimado.
- Margen bruto estimado.
- Producto líder.
- Producto con menor margen porcentual.
- Cobertura de carta contra ventas diarias cuando es calculable.

Decisión importante:

No se introdujo todavía BCG dentro del informe profesional porque Menu Engineering tenía una inconsistencia previa entre librería y action. Se evitó llevar una clasificación ambigua al informe.

## Fase 6.5 — Consolidación y QA profesional

Se reforzó el sistema para poder probar informes completos con datos deterministas.

Logros principales:

- Seed demo `seedProfessionalReportDemoData()`.
- Endpoint dev/staging `/api/seed-reporting-demo`.
- Dataset demo completo para febrero 2026.
- Tests de server action para confirmar carga multi-fuente.
- Exportación imprimible más cuidada.
- Limpieza de datos demo después de verificación.

Incidencia resuelta:

Durante la verificación se detectó que la limpieza demo de ventas por receta podía borrar más filas de las debidas. Se corrigió para borrar solo ventas asociadas a recetas demo identificadas.

## Fase 7 — Unificación de Menu Engineering

Se cerró la inconsistencia de la fórmula BCG.

Antes:

- La librería usaba promedio real del menú.
- La action `calculateMatrix` usaba `expectedMix * 0.7`.
- El simulador cliente duplicaba la regla antigua.

Ahora:

- Existe `calculateMenuEngineeringAnalysis()` como fuente única.
- La action `calculateMatrix()` usa ese motor.
- El simulador cliente usa ese motor.
- `avg_popularity` se define como `1 / numero_de_items`, guardado como decimal.
- El caso frontera entre 25% y 17,5% queda cubierto con tests.

## Revisión externa y remediación de seguridad

Una revisión independiente de Claude detectó correctamente que Menu Engineering cerraba la fórmula BCG, pero mantenía riesgos previos de multi-tenancy en varias actions.

Se corrigió:

- `updateReportItem` comprueba que el item pertenece a un reporte del restaurante activo antes de actualizar.
- `deleteReport` filtra por `id` y `restaurant_id`.
- `calculateMatrix` valida propiedad del reporte antes de leer items y filtra el update final por restaurante.
- `getMenuReports` y `getMenuReport` usan `getUserRestaurant()` y filtran por restaurante activo.
- Se añadió migración RLS para `menu_reports` y `menu_report_items`.
- Se añadieron tests de seguridad para estas actions.
- Se añadieron tests a `saveProfessionalReportDraft` para snapshot regenerado, sanitización, pertenencia y retry por versión duplicada.

## Fase 7.2 — Limpieza analítica y QA menor

Se cerraron reservas no bloqueantes antes de avanzar a nuevas funcionalidades.

Logros principales:

- `getStats().avgMargin` queda alineado con la matriz BCG: margen de contribución unitario ponderado por unidades vendidas.
- Casos límite de Menu Engineering cubiertos con tests: un solo item, PVP cero y margen negativo.
- `weekday_spread_pct` pasa a ser una brecha acotada sobre el día fuerte; la narrativa explica que el día débil queda X% por debajo.
- Evidencias de turnos usadas como proxy laboral marcadas como `estimated`.
- Endpoint demo de reporting con autenticación HTTP y límite por usuario/IP.
- `safe-action.ts` migra el catch general a logger estructurado.

## Cambios de infraestructura y robustez

- `tsconfig.typecheck.json` para typecheck estable.
- `scripts/run-next-build.mjs` para build más controlado.
- Ajustes de ESLint y configuración para el estado real del proyecto.
- Nuevas rutas de error/not-found/proxy según estructura actual de Next.
- Refuerzos en helpers de auditoría, admin, acceso y after hooks.

## Verificación final realizada

Última verificación ejecutada tras la Fase 7:

- `npx eslint --max-warnings=0` correcto.
- `npm run typecheck` correcto.
- `npm test` correcto: 29 archivos, 304 tests.
- `npm run build` correcto.
- Browser real en `http://localhost:3000/menu-engineering` correcto, sin errores de consola.

Verificación posterior a la revisión externa:

- Tests focales de Menu Engineering y reporting actions correctos.
- Fase 7.2 verificada con `npx eslint --max-warnings=0`, `npm run typecheck`, `npm test` (30 archivos, 314 tests) y `npm run build`.

Nota sobre un timeout:

Un test de ingredientes hizo timeout cuando se ejecutó a la vez que el build. Se revisó ejecutándolo aislado y después repitiendo la suite completa; ambos pasaron. La causa fue contención de recursos, no fallo funcional.

## Estado funcional actual

La aplicación ya tiene:

- Base de reporting profesional trazable.
- Revisión editable del informe.
- Versionado y exportación imprimible.
- Sección de carta descriptiva dentro del informe.
- Dataset demo para verificar informes completos.
- Menu Engineering con fórmula única y testeada.
- Reservas menores principales cerradas antes de incorporar BCG al informe profesional.

## Decisiones pendientes

1. Decidir si los cuadrantes BCG entran en el informe profesional.
2. Diseñar cómo explicar BCG al cliente sin sobreprometer precisión.
3. Migrar `saveScenario` a server action si se quiere eliminar por completo la lectura client-side residual de `restaurant_id`.
4. Mejorar experiencia visual del informe final si se quiere acercar más al ejemplo externo de consultoría.
5. Valorar exportación PDF server-side si el HTML imprimible no cubre el estándar final esperado.

## Archivos de referencia

- `docs/ai/T11-reporting-profesional.md`
- `docs/ai/19-reports.md`
- `docs/ai/09-menu-engineering.md`
- `docs/ai/T04-financial-math.md`
- `docs/ai/phase-1-reporting-cierre.md`
- `docs/ai/phase-2-reporting-cierre.md`
- `docs/ai/phase-3-reporting-cierre.md`
- `docs/ai/phase-4-reporting-cierre.md`
- `docs/ai/phase-5-reporting-cierre.md`
- `docs/ai/phase-6-reporting-cierre.md`
- `docs/ai/phase-6-5-reporting-consolidacion.md`
- `docs/ai/phase-7-menu-engineering-cierre.md`
- `docs/ai/phase-7-1-security-review-remediation.md`
- `docs/ai/phase-7-2-analytical-cleanup.md`
