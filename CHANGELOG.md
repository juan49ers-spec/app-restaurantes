# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses semantic versioning for release tags.

## [2.0.0] - 2026-05-29

### Added

- Professional reporting workflow with immutable draft snapshots, READY status,
  publication controls, quality gate, printable reports, and client portal
  delivery.
- Client portal with published report list, report detail, executive briefing,
  KPIs, chapter navigation, period comparison, multi-period trend, expense
  breakdown, suggested actions, review plan, PDF print view, report view
  tracking, and meeting requests.
- Consultant workspace with preparation checklist, period selector, weighted
  completion, delivery workflow, client portfolio, onboarding flow, branding,
  meeting request management, and first-report guidance.
- Multi-client foundation through `consultant_restaurants`, active client
  selection, admin relationship management, and portfolio UI.
- CSV import flows for financial data, recipe sales, shifts, invoice headers,
  recipes, and employees with preview, preflight duplicate checks, server-side
  validation, and import issue exports.
- Deterministic report narrative templates and consultant briefing generation
  without LLM dependency.
- Delivery notifications, notification settings routing, commercial demo QA
  command, portal visual QA coverage, and full consultant-to-client delivery QA.
- Health check route and proxy bypass for `/api/health`.
- Internal `docs/ai/` documentation and implementation prompts for the
  reporting, portal, consultant, import, QA, and hardening phases.

### Changed

- Upgraded client portal presentation and printable report experience for a
  more professional consultant-facing delivery package.
- Refactored large server-action modules and technical debt hotspots to improve
  maintainability and logging consistency.
- Improved verification workflow stability, Node.js CI support, listener
  warnings, and local build/test reliability.
- Added guarded CSV file input support to import panels.
- Improved consultant preparation scoring, checklist severity grouping, and
  action prioritization.
- Centralized admin authorization and improved consultant client onboarding
  paths.

### Fixed

- Secured menu engineering tenant access and closed IDOR risks with scoped
  actions and RLS migrations.
- Stabilized visual QA, production portal sessions, request timestamps, and
  flaky component tests.
- Rejected negative sales CSV imports.
- Scoped invoice access by restaurant.
- Cleared stale consultant client cookies when relationships are no longer
  active.
- Routed notification settings to the notifications page.
- Fixed alert notification table availability and extended alert RLS to active
  consultants.
- Exposed health check through the proxy.

### Security

- Added RLS policy coverage guard tests for critical tables.
- Added multi-client access validation through server-side relationship checks.
- Added anti-duplicate meeting request protection and unique open request
  migration.
- Added guard tests to prevent hardcoded E2E credentials.
- Hardened admin authorization and consultant relationship management.
- Hardened alert rule and alert notification policies for owners and active
  consultants.
- Removed production debug API routes in the hardening branch following this
  release tag.

