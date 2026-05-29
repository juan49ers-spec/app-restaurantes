# Contributing

This is a private commercial product. Contributions are accepted only from
authorized collaborators.

## Workflow

1. Create a branch from `main`.
2. Use a descriptive branch name, for example `fix/tenant-scope-alerts` or
   `feat/client-portal-review`.
3. Read the relevant `docs/ai/` file before changing a module.
4. Keep commits atomic and use Conventional Commits:
   - `feat: add client delivery workflow`
   - `fix: scope invoices by restaurant`
   - `docs: update portal documentation`
   - `ci: validate supabase migrations`
   - `chore: update repository metadata`
5. Run `npm run verify` before opening a pull request.
6. Open a pull request with a clear summary, verification notes, and screenshots
   for UI changes.

## Required checks

Before requesting review, run:

```bash
npm run verify
```

For changes involving Supabase migrations, also run:

```bash
npm run validate:migrations
```

## Documentation rules

The source of truth for AI-agent and module documentation is `docs/ai/`.
Do not update legacy files under `docs/` such as `ARCHITECTURE.md`,
`FEATURES.md`, `HOOKS.md`, or `SERVICES.md`.

When a change touches behavior, data flow, permissions, database tables, or
edge cases, update the corresponding `docs/ai/` file in the same pull request.

## Security

Never commit secrets. Real environment files must stay ignored by git.
Use `.env.example` as the template for required variables.
