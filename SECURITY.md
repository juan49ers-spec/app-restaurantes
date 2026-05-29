# Security Policy

## Supported versions

Security fixes are applied to the current `main` branch and the latest tagged
major release.

| Version | Supported |
| ------- | --------- |
| 2.x     | Yes       |
| 1.x     | No        |

## Reporting a vulnerability

Do not open a public issue for security vulnerabilities.

Send a private report to the repository owner with:

- a clear description of the vulnerability,
- affected routes, tables, actions, or components,
- reproduction steps,
- impact assessment,
- any suggested fix or mitigation.

We will acknowledge valid reports as soon as possible, triage severity, and
prepare a private fix before disclosure.

## Handling secrets

Never commit real `.env` files, service-role keys, API keys, database URLs, or
test credentials. Use `.env.example` as the only committed environment template.

## Production data

Do not run destructive migrations or seed scripts against production unless the
operation has been explicitly approved and backed up.
