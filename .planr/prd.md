# PRD: App Finanzas Restaurante (v2.0)

## Product Vision
Una plataforma integral para la gestión financiera de restaurantes, que permite el control de ventas diarias, gastos operativos, inventario y previsiones fiscales (IVA/IRPF) con una infraestructura de testing autónoma y resiliente.

## Key User Stories
- **US1: Registro de Ventas Diarias**. El usuario puede registrar los ingresos diarios desglosados por base imponible e IVA (10%/21%). (3 SP)
- **US2: Gestión de Gastos Operativos**. El usuario puede registrar gastos, categorizarlos (Materia Prima, Personal, etc.) y adjuntar detalles del proveedor. (3 SP)
- **US3: Dashboard de Control Financiero**. Una vista consolidada que muestra variaciones MoM (Month-over-Month) y alertas de objetivos (Personal/COGS). (4 SP)
- **US4: Previsiones Fiscales Trimestrales**. Cálculo automático de balances de IVA e IRPF retenido para los modelos 111 y 115. (4 SP)
- **US5: Testing Trifecta con IA**. Implementación de Shortest (E2E NLP), EvoMaster (API Fuzzing) y Testsigma (Regresión/Mantenimiento). (6 SP)

## Constraints
- **Seguridad**: Los datos financieros deben estar protegidos por RLS (Row Level Security) en Supabase.
- **Rendimiento**: El dashboard debe cargar en menos de 2 segundos mediante optimización de consultas SQL.
- **Escalabilidad**: El sistema de diseño debe permitir cambios globales inmediatos mediante tokens CSS.

## High-Level Architecture
- **Frontend**: Next.js (App Router) + Tailwind CSS + Framer Motion.
- **Backend**: Next.js Server Actions + Supabase (PostgreSQL).
- **Auth**: Supabase Auth (OTP/Email).
- **Control de Calidad**: Vitest + Shortest + EvoMaster + Testsigma.
