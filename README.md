# ControlHub Pro - Restaurant Finance SaaS

![Project Status](https://img.shields.io/badge/status-active_development-brightgreen)
![CI](https://github.com/juan49ers-spec/app-restaurantes/actions/workflows/ci.yml/badge.svg)

## Overview

ControlHub Pro is a private SaaS platform for restaurant financial management
and consulting delivery. The current product is consultant-first: a consultant
loads and validates restaurant data, generates professional reports, publishes
them to a client portal, and manages the follow-up workflow.

## Current capabilities

- **Professional reporting**: immutable report snapshots, versioned drafts,
  READY status, quality gate, publication controls, printable PDF view, and
  consultant briefing.
- **Client portal**: published report list, executive cover, report chapters,
  KPIs, period comparisons, multi-period trend, expense breakdown, suggested
  actions, review plan, PDF download/print, view tracking, and meeting request
  flow.
- **Consultant workspace**: preparation checklist, weighted completion,
  first-report guide, delivery workflow, meeting request management, branding,
  and client portfolio.
- **Multi-consultant foundation**: `consultant_restaurants` relationships,
  active client selection, admin management, RLS guards, and stale-cookie
  cleanup.
- **CSV onboarding imports**: sales, expenses, recipe sales, shifts, invoice
  headers, recipes, and employees with preview, preflight duplicate checks,
  server-side validation, and issue exports.
- **Menu engineering**: recipe costing, contribution margin analysis, BCG
  matrix classification, scenarios, and integration into professional reports.
- **Financial control**: daily sales, operating expenses, monthly targets,
  trends, and profitability indicators.
- **Notifications and QA**: delivery notifications, health check, visual QA,
  full delivery flow tests, RLS coverage guards, and commercial demo readiness.

## Tech stack

- **Framework**: Next.js App Router
- **Language**: TypeScript
- **Database/Auth**: Supabase PostgreSQL + Supabase Auth
- **UI**: Tailwind CSS, Radix UI primitives, Lucide React, Recharts
- **Validation**: Zod
- **Tests**: Vitest, Testing Library, Playwright

## Getting started

1. Clone the repository.

   ```bash
   git clone https://github.com/juan49ers-spec/app-restaurantes.git
   cd app-restaurantes
   ```

2. Install dependencies.

   ```bash
   npm install
   ```

3. Configure environment variables.

   ```bash
   cp .env.example .env.local
   ```

   Fill `.env.local` with local Supabase credentials and any optional
   integration keys needed for your workflow.

4. Start the development server.

   ```bash
   npm run dev
   ```

## Verification

Run the full local verification pipeline before opening a pull request:

```bash
npm run verify
```

For Supabase migration changes:

```bash
npm run validate:migrations
```

## Repository documents

- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
- [License](LICENSE)
- [Security policy](SECURITY.md)
- [Environment template](.env.example)

## Documentation for AI agents

The canonical internal documentation is under `docs/ai/`.
Legacy documentation under `docs/` is not the source of truth for new work.
