# Cierre Fase 38 — Demo comercial cerrada

## Objetivo

Dejar un comando y una guía clara para validar la app antes de enseñarla a clientes.

## Cambios aplicados

- Nuevo script `npm run qa:commercial-demo`.
- Nuevo ejecutable `scripts/cli/qa-commercial-demo.mjs`, que lanza el QA funcional consultor -> cliente y el test guardia de demo.
- `qa:client-flow` ahora incluye los tests de:
  - asistente de primer informe;
  - panel visual del primer informe guiado;
  - plan de revisión del portal cliente;
  - componente del plan de revisión.
- Actualizada la guía comercial de Fase 30 para usar el nuevo comando y mostrar las piezas nuevas.

## Tests

- `tests/qa/commercial-demo-readiness.test.ts` comprueba que existe el comando comercial y que el QA del flujo incluye las piezas nuevas que se enseñan en demo.

## Resultado

Antes de una reunión comercial, el consultor tiene un comando único para comprobar el recorrido que va a enseñar y reducir el riesgo de mostrar una pieza rota.
