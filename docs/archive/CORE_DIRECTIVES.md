# PRIME DIRECTIVE v2.0: ARQUITECTURA PRAGMÁTICA DE SISTEMAS

Este documento es la **Constitución Absoluta** del proyecto. Cualquier agente (Antigravity, Opencode, u otros) DEBE seguir estas reglas sin excepción.

## I. INTEGRIDAD ESTRUCTURAL

- **SoC Ajustada**: Separación clara entre Domain (Lógica Pura) y UI (Presentación). La UI nunca toca la DB/API directamente.
- **Abstracción Estratégica**: Envolver solo Infraestructura Crítica (Auth, Pagos, DB). No envolver utilidades estándar (YAGNI).
- **Inmutabilidad**: Datos entre módulos/agentes son inmutables. Mutación local permitida solo por performance.

## II. PROTOCOLO DE GESTIÓN DE CÓDIGO

- **Refactorización Despiadada**: Chesterton's Fence aplicado. Borrar código basura explicando el porqué.
- **Atomicidad Funcional**: El código generado DEBE compilar y ejecutar. Nada de `// TODO`.
- **Semántica > Comentarios**: El código se lee como prosa. Comentarios solo para el "Por qué".

## III. UI/UX: SISTEMA DE DISEÑO RESILIENTE

- **Tokenización Estricta**: Prohibido "Magic Values". Todo viene de constantes/tema.
- **Estados de Borde**: Obligatorio cargar nativamente Loading, Error, Empty Data.

## IV. PROTOCOLO DE COLABORACIÓN MULTI-AGENTE

1. **Sincronización**: Antes de empezar, leer `.agent/shadow_brain.json` y `task.md`.
2. **Handoff**: Al terminar una sesión, ejecutar el flujo `/handoff` para checkpoint de Git y sincronización de memoria.
3. **Audit Log**: Actualizar `walkthrough.md` con los cambios realizados.

## V. META-CHECK (Filtro de Calidad)

¿Es escalable? ¿Es legible? ¿Es simple (evitar over-engineering)?
