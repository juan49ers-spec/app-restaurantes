---
description: Handoff protocol for multi-agent synchronization (Antigravity <> Opencode) Enterprise
---

# /handoff — Protocolo de Delegación Autónoma a OpenCode

Este workflow define **cuándo** y **cómo** Antigravity debe delegar la creación o refactorización de código pesado a una instancia de OpenCode en background, usando aislamiento radical.

## 🟢 CONDICIONES DE ACTIVACIÓN (Trigger)

Antigravity **DEBE** activar este workflow automáticamente si se cumplen 3 de estas 4 condiciones:

1. **Volumen Predecible / Boilerplate**: Escribir mucho código repetitivo.
2. **Arquitectura Finalizada**: Decisiones de diseño tomadas.
3. **Aislamiento Funcional**: Código a modificar es modular e independiente.
4. **Cero Ambigüedad Lógica**: Lógica de negocio estándar.

Si se cumplen, **NO ESCRIBAS EL CÓDIGO TÚ MISMO**. Procede al Handoff.

---

## 🚀 PASO 1: Aislamiento Radical (Git Worktrees)

Antigravity asume el control e informa al usuario. Acto seguido, en lugar de lanzar OpenCode en el directorio principal, DEBE aislar el proceso:

1. Elige un ID corto para la tarea (ej. `feat-login-ui`).
2. Aislar entorno con caché y optimizar setup:
   Ejecuta: `powershell .agents/scripts/handoff-prepare.ps1 -TaskID <id-tarea>`
3. El worker ejecutará sus comandos EXCLUSIVAMENTE dentro de ese worktree aislado.

---

## 🧠 PASO 2: Generación del Prompt de Handoff (Memory & Context)

Antigravity crea un prompt blindado para OpenCode. Debe incluir imperativamente:

- La tarea exacta y los archivos a modificar.
- **Memoria Muscular Compartida:** Inyectar el flag `--context .agents/architecture.md` para que conozca el stack y reglas absolutas del proyecto.
- **Inyección Dinámica de Contexto:** Añadir Skills relevantes.
- **Auto-Curación Obligatoria (Closed-Loop Testing):** Instruir a OpenCode a autocorregirse usando linters de forma iterativa.
- **[NUEVO] Regla Anti-Infinity Loop:** Añade el aviso explícito: *"Si un validador (linter/test runner) lanza un error de excepción de motor/stack interno y NO un error de código, ABORTA el fix, prioriza TypeScript, y devuelve la advertencia de 'tooling fallido' para no atascarte en un bucle infinitamente."*

---

## ⚙️ PASO 3: Ejecución en Background (Fleet System)

Antigravity lanza el comando de OpenCode en el background. 

**Regla de Modelos Híbridos (Fast/Slow Routing):** 
- Para tareas iterativas, React simple o refactors mecánicos: usa el misil local `ollama/qwen2.5-coder:7b`.
- Para refactors arquitectónicos masivos, algorítmica pesada cruzada o setup complejos: pasa el modelo Cloud respectivo si el usuario te lo permite (ej. `-m anthropic/claude-3.5-sonnet`).

**Regla de Parallel Dispatching:** Lanza máximo 2 o 3 instancias simultáneas (Resource Cap).

// turbo

```bash
cd .worktrees/<id-tarea>
mkdir -p .agents/logs/
opencode run -m "ollama/qwen2.5-coder:7b" "Implementa [tarea]. AUTO-CURACIÓN: Lanza [comando test/lint], analiza salida y arréglalo tú mismo. PROHIBIDO fallar. LEYES: [leyes]. VERIFICA." > .agents/logs/opencode_handoff_$(Get-Date -Format 'yyyyMMddHHmmss').log 2>&1
```

---

## 🔄 PASO 4: Seguimiento y Revisión en Dos Fases (Subagent Review)

El usuario puede ver el estado en tiempo real gracias al **Monitor de Flota**:
Ejecutando `powershell .agents/scripts/fleet-monitor.ps1`

Cuando OpenCode termina en su worktree (visto en monitor como COMPLETED):
1. **Fase Lint, Tests & Auto-Sanación:** Antigravity ejecuta el validador:
   `powershell .agents/scripts/handoff-merge.ps1 -TaskID <id-tarea> -Model "ollama/qwen2.5-coder:7b"`
2. Este script localmente validará LINT (`npm run lint`), TSC y TESTS dentro del worktree de aislamiento. **Si fallan, el script creará un prompt y re-lanzará solos a OpenCode** (hasta 3 retries) para parchear sus propios errores.
3. **Subagent Documentation:** Si supera todo o sana exitosamente, la rama se mergea automáticamente a main y el worktree local se destruye. E inicializa el workflow `/commit` (que incluirá a Ollama para documentarlo) para persistir la labor en la historia.
