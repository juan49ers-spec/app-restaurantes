# Cierre parcial Fase 19 — Hardening de seguridad

## Alcance

Se añade una primera red de seguridad automatizada para evitar regresiones en RLS de tablas críticas del flujo consultor → portal cliente.

## Qué se verifica

El test `tests/security/rls-policy-coverage.test.ts` escanea las migraciones SQL versionadas y comprueba que estas tablas tengan RLS y políticas documentadas:

- `professional_report_drafts`
- `portal_meeting_requests`
- `menu_reports`
- `menu_report_items`
- `consultant_restaurants`

También verifica que `consultant_restaurants` esté acotada por `consultant_user_id = auth.uid()`, que el owner del restaurante pueda leer sus relaciones y que exista `GRANT SELECT` explícito para el rol `authenticated`.

## Por qué importa

El proyecto ya sufrió revisiones de IDOR/RLS en Menu Engineering. Este test no sustituye una auditoría SQL real en Supabase, pero evita que una migración futura elimine accidentalmente las defensas versionadas de las tablas más sensibles.

## Limitaciones

- Es un test estático sobre migraciones, no ejecuta políticas contra una base real.
- No cubre todavía todas las tablas operativas históricas.
- La auditoría completa de producción debe complementarse con pruebas contra Supabase y, cuando esté disponible, RLS Tester del dashboard.

## Siguiente paso recomendado

Ampliar esta fase con tests de aislamiento multi-tenant ejecutando queries simuladas sobre dos restaurantes y un consultor con relaciones distintas.
