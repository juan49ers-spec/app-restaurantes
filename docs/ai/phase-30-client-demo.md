# Cierre Fase 30 — Guía demo cliente

## Objetivo

Dar al consultor un guion claro para enseñar ControlHub a clientes sin improvisar y sin exponer zonas internas que todavía no aportan valor comercial.

## Preparación antes de enseñar

1. Ejecutar `npm run qa:commercial-demo`.
2. Si se quiere una verificación más rápida durante desarrollo, ejecutar `npm run qa:client-flow`.
3. Si se enseña el portal real, ejecutar también `RUN_VISUAL_QA=true npm run qa:client-flow`.
4. Confirmar que hay al menos un informe publicado en `/portal`.
5. Abrir previamente:
   - `/consultant`
   - `/portal`
   - `/portal/reports/[id]`
   - `/reports/print/[draftId]`

## Guion recomendado

### 1. Problema del cliente

Explicar que el restaurante suele tener datos repartidos: ventas, gastos, facturas, turnos, recetas y carta. El valor de ControlHub es convertir esos datos en una entrega entendible, no solo en tablas.

### 2. Mesa del consultor

Mostrar `/consultant`:

- Asistente de primer informe guiado.
- Checklist del periodo.
- Bloqueantes y recomendaciones.
- Flujo de entrega.
- Solicitudes de reunión.
- Marca del consultor.

Mensaje clave: el consultor sabe qué falta antes de publicar.

### 3. Portal del cliente

Mostrar `/portal`:

- Portada ejecutiva.
- KPIs destacados.
- Estado del informe.
- Histórico publicado.
- Acceso al informe web y PDF.

Mensaje clave: el cliente no entra al backoffice; entra a un área limpia y profesional.

### 4. Detalle del informe

Mostrar `/portal/reports/[id]`:

- Conclusiones ejecutivas.
- Plan de revisión del cliente.
- Capítulos.
- Tendencia de 3 meses.
- Desglose de gastos.
- Acciones sugeridas.
- Solicitud de reunión.

Mensaje clave: el informe es interactivo y accionable.

### 5. PDF

Mostrar `/reports/print/[draftId]`:

- Portada.
- Índice.
- KPIs.
- Plan de revisión.
- Anexo de calidad de dato.

Mensaje clave: el cliente puede conservar una versión imprimible, pero el portal es la experiencia principal.

## Qué no enseñar todavía

- Paneles internos no relacionados con la entrega.
- Configuración técnica.
- Datos de otros restaurantes.
- Credenciales o variables de entorno.

## Cierre comercial

La demo debe terminar en el flujo de reunión: el cliente lee el informe, solicita revisión y el consultor recibe la solicitud en su mesa interna.
