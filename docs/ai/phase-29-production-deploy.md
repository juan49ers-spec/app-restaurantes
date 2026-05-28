# Cierre Fase 29 — Deploy y validación producción

## Objetivo

Desplegar el estado verificado a producción y comprobar que el flujo cliente funciona contra el dominio real.

## Deploy

- Plataforma: Vercel.
- Proyecto: `app-finanzas-restaurante`.
- Alias producción: `https://app-finanzas-restaurante.vercel.app`.
- Estado Vercel: `READY`.

## Validación técnica

- `/api/health` respondió `200`.
- Respuesta de salud:
  - `status: healthy`
  - `database.ok: true`
  - `version` coincide con el commit desplegado.

## QA remoto

Se ejecutó `QA_BASE_URL=https://app-finanzas-restaurante.vercel.app RUN_VISUAL_QA=true npm run qa:client-flow`.

- QA determinista consultor -> cliente: pasada.
- Actions portal y anti-duplicado: pasadas.
- Workspace consultor y cartera: pasados.
- Componentes visibles de entrega: pasados.
- Playwright remoto portal visual: 12/12 tests pasados.

## Incidencia encontrada y cierre

En la primera pasada remota apareció un flaky de login móvil que pasó en retry. Se corrigió el helper E2E para esperar botón habilitado, registrar la espera de navegación antes del click y aumentar el margen de espera a producción. La segunda pasada remota terminó 12/12 sin retries.

## Regla operativa

Antes de enseñar la app a un cliente, ejecutar:

```bash
npm run qa:client-flow
```

Para validar el dominio real:

```bash
QA_BASE_URL=https://app-finanzas-restaurante.vercel.app RUN_VISUAL_QA=true npm run qa:client-flow
```
