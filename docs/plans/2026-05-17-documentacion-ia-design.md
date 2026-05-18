# Diseño — Documentación AI-first del proyecto (`docs/ai/`)

**Fecha:** 2026-05-17
**Estado:** Aprobado por el usuario, pendiente de plan de implementación.

## Objetivo

Crear una carpeta `docs/ai/` con documentación pensada **para ser consumida por agentes de IA**, no por clientes. Su propósito es que la IA entienda completamente cómo funciona la aplicación y pueda tomar decisiones bien informadas sobre las implicaciones de cualquier cambio (añadir funciones, modificar páginas, refactorizar).

La documentación debe responder, para cada página y para cada pieza transversal:

- Qué hace y por qué existe (rol en el negocio del restaurante).
- Viaje del usuario.
- Cómo fluyen los datos técnicamente.
- Reglas de negocio, restricciones e invariantes.
- Implicaciones cruzadas con otras partes de la app.
- Casos límite.
- Checklist para modificarlo sin romper nada.

## Decisiones tomadas durante el brainstorming

| # | Pregunta | Elección |
|---|----------|----------|
| 1 | Unidad de documentación | Un archivo por **ruta/página top-level** |
| 2 | Documentación transversal | Archivos aparte con prefijo `T` (T01, T02…) |
| 3 | Plantilla de contenido | Operativa para IA, 7 secciones fijas |
| 4 | Ubicación + docs existentes | `docs/ai/` nueva. Docs viejos se leen como input (sin modificar); el código manda si hay conflicto. |
| 5 | Ritmo de ejecución | Todo de una sentada (sin piloto previo) |

## Estructura final de `docs/ai/`

```
docs/ai/
├── README.md                       ← Índice maestro
├── 00-vision-general.md            ← Mapa mental, módulos, glosario
├── 01..NN-<pagina>.md              ← Una por ruta top-level
├── T01-arquitectura.md
├── T02-base-de-datos.md
├── T03-autenticacion.md
├── T04-financial-math.md
├── T05-hooks-y-providers.md
└── T06-server-actions-comunes.md
```

La lista exacta de páginas se confirma tras explorar `src/app/`. Candidatas conocidas: login, onboarding, admin, financial-control, menu-engineering, recipes, escandallos, ingredients, stock, suppliers, purchasing, invoices, staff, operational, desperdicios, notifications, api.

## Plantilla fija de archivo de página

```markdown
# NN — [Nombre]

**Ruta:** `/ruta`
**Archivos clave:** rutas a page.tsx, actions, componentes principales
**Transversales relacionados:** T0X, T0Y

## 1. Propósito y rol en el negocio
## 2. Viaje del usuario
## 3. Flujo técnico de datos
## 4. Reglas de negocio y restricciones
## 5. Dependencias e implicaciones cruzadas
## 6. Casos límite y errores conocidos
## 7. Al añadir/modificar una función aquí
```

Los archivos `T…` usan plantilla más libre: propósito, contrato, ejemplos de uso, gotchas, ubicación en el repo.

## Fuentes de verdad

1. **Código** en `src/` — fuente primaria, manda siempre.
2. **Esquema Supabase** en `supabase/` y `migrations/`.
3. **Docs existentes** en `docs/` (`ARCHITECTURE.md`, `FEATURES.md`, `HOOKS.md`, `SERVICES.md`, etc.) — input útil pero **verificar contra el código** antes de copiar.
4. **CLAUDE.md** en raíz.
5. **README.md** del proyecto.

## Lo que NO se hace en este diseño

- No se modifican los docs existentes en `docs/` (ARCHITECTURE.md, FEATURES.md, etc.).
- No se reorganizan los `.md` sueltos en la raíz del proyecto.
- No se genera documentación por componente individual (solo páginas + transversales).
- No se documenta para usuario final ni cliente.
