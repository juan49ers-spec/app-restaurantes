# Cierre Fase 22 — Onboarding comercial del consultor

## 1. Objetivo

Reducir la fricción entre crear un restaurante cliente y llegar al primer informe publicado.

La fase no cambia permisos ni automatiza operaciones sensibles. Mejora la pantalla de alta para que el consultor tenga un recorrido claro y verificable después de crear el cliente.

## 2. Qué se ha añadido

- `ClientOnboardingWizard` ahora muestra un recorrido de primer informe publicado:
  1. seleccionar cliente activo;
  2. importar ventas y gastos;
  3. completar carta, turnos o facturas;
  4. guardar informe `READY`;
  5. publicar y validar portal.
- Cada paso tiene responsable, tiempo estimado, descripción y enlace al módulo correspondiente.
- Después de crear el cliente, aparece un enlace directo a `/consultant` para seleccionar o revisar la cartera.
- La pantalla recuerda ejecutar `npm run qa:client-flow` antes de enseñar el portal con datos reales.

## 3. Flujo técnico de datos

No se añaden nuevas queries ni mutaciones.

`ClientOnboardingWizard` sigue llamando a `createAdminClientWorkspace()` para crear el restaurante y la relación consultor-restaurante. El resto es UI de guía y navegación hacia módulos ya existentes.

## 4. Reglas de negocio

- El alta sigue requiriendo owner existente.
- La relación consultor-restaurante sigue validándose en servidor y en RLS.
- El recorrido post-alta no importa datos, no genera informes y no publica.
- El primer informe real sigue dependiendo de la checklist de `/consultant` y del quality gate de `/reports`.

## 5. Dependencias e implicaciones cruzadas

- Admin: `/admin/client-onboarding`.
- Consultant Workspace: `/consultant`.
- Financial Control: `/financial-control`.
- Stock/carta: `/stock`.
- Reports: `/reports`.
- Portal: `/portal`.
- QA operativo: `npm run qa:client-flow`.

## 6. Casos límite

- Si el cliente se crea sin consultor asignado, el recorrido se muestra igual, pero el admin deberá asignar relación después desde `/admin/consultants`.
- Si el owner elegido no tiene sesión activa, el restaurante existe, pero el uso operativo dependerá de que ese usuario pueda autenticarse.
- Si faltan datos, `/consultant` y `/reports` siguen marcando los bloqueos reales.

## 7. Verificación

- Test de componente actualizado para confirmar creación de cliente, enlace a cartera, pasos del recorrido y comando QA.
- `npm run verify` debe seguir pasando antes de cerrar la fase.
