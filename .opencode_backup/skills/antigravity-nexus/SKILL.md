---
name: antigravity-nexus
description: Unified bridging skill to synchronize work with Antigravity AI.
---

# Antigravity Nexus Skill

Este "skill" te otorga la capacidad de colaborar de forma determinista con Antigravity AI. DEBES usar estas instrucciones cada vez que inicies una sesión en este workspace.

## 1. Sincronización de Contexto (OBLIGATORIO) al iniciar

Antes de cualquier acción, lee los siguientes archivos en orden:

1. `CORE_DIRECTIVES.md`: Tu constitución arquitectónica. No la violes.
2. `.agent/shadow_brain.json`: El estado actual del sistema (quién hizo qué, bloqueadores conocidos).
3. `C:\Users\Usuario\.gemini\antigravity\brain\d0073aba-1251-46e9-9abb-78fd1ff8e6f5\task.md`: El checklist de la misión.

## 2. Reglas de Operación

- **No reinventar la rueda**: Si Antigravity ya tiene un `implementation_plan.md`, SÍGUELO. No propongas planes alternativos a menos que encuentres un error crítico.
- **Audit Log**: Al terminar una tarea, actualiza `C:\Users\Usuario\.gemini\antigravity\brain\d0073aba-1251-46e9-9abb-78fd1ff8e6f5\walkthrough.md` para que Antigravity sepa qué has hecho exactamente.
- **Handoff**: Utiliza el comando `/handoff` si está disponible, o describe claramente el estado final en un commit con el prefijo `[AGENT_HANDOFF]`.

## 3. Resolución de Conflictos

Si Antigravity te ha dejado una instrucción en `task.md` que contradice tu intuición, prioridad SIEMPRE a `CORE_DIRECTIVES.md`. Si la duda persiste, pregunta al USER citando ambos archivos.
