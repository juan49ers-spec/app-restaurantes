# Cierre Fase 7.2 — Limpieza analitica y QA menor

Fecha: 2026-05-26

## Objetivo

Cerrar las reservas menores detectadas tras la revision externa sin avanzar todavia a nuevas funcionalidades. La prioridad fue reforzar confianza: formulas coherentes, edge cases cubiertos y endpoint demo menos expuesto.

## Qué se corrigió

- `MenuEngineeringCalculator.getStats().avgMargin` vuelve a representar el margen de contribucion unitario ponderado por ventas (`Σ total_profit / Σ quantity_sold`), igual que la matriz BCG.
- Se eliminaron comentarios obsoletos en `src/lib/menu-engineering.ts`.
- La brecha semanal del informe profesional queda acotada: ahora mide cuanto queda el dia debil por debajo del dia fuerte, no cuanto crece el fuerte sobre el debil.
- Las evidencias basadas en turnos se marcan como `estimated` cuando se usan como proxy de coste laboral.
- `/api/seed-reporting-demo` exige usuario autenticado antes de ejecutar la seed y limita ejecuciones repetidas por usuario/IP.
- `safe-action.ts` deja de usar `console.error` directo y usa el logger estructurado del proyecto.

## Tests añadidos

- Menu Engineering con un solo item.
- Menu Engineering con PVP cero.
- Menu Engineering con margen negativo.
- `getStats().avgMargin` como margen ponderado, no porcentaje aritmetico.
- Brecha semanal acotada en reporting profesional.
- Endpoint demo con `401` sin usuario y `429` por rate limit.

## Decisiones de producto

- Un reporte BCG de un solo item sigue clasificando STAR por igualdad matematica de umbrales, pero queda documentado como resultado sin valor analitico.
- La metrica `weekday_spread_pct` conserva su id para no romper consumidores, pero cambia su significado narrativo a porcentaje acotado sobre el dia fuerte.
- El endpoint demo sigue siendo herramienta de QA/dev, no funcionalidad de cliente.

## Verificacion realizada

- `npm test -- tests/unit/menu-engineering-lib.test.ts`
- `npm test -- tests/reporting/professional-report.test.ts tests/reporting/seed-reporting-demo-route.test.ts`
- `npm test -- tests/unit/safe-action.test.ts`
- `npx eslint --max-warnings=0`
- `npm run typecheck`
- `npm test` — 30 archivos, 314 tests.
- `npm run build`

Resultado: todo correcto.
