# Contributing

Thanks for your interest in contributing.

## Workflow

1. Fork the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature
   ```
2. Install dependencies and copy environment variables:
   ```bash
   npm install
   cp .env.example .env.local
   ```
3. Make your changes following the coding standards described in
   [CLAUDE.md](CLAUDE.md).
4. Run the full local check before pushing:
   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```
5. Open a Pull Request against `main` with:
   - A short summary of the change.
   - Steps to reproduce / test.
   - Screenshots for UI changes.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add menu engineering BCG matrix
fix(ocr): handle empty Anthropic response
chore: bump dependencies
```

## Code standards

- TypeScript strict mode — no `any`.
- Files under 800 lines, functions under 50 lines.
- Tests for new business logic (target: 80% coverage).
- No hardcoded secrets — read from environment variables.

## Reporting bugs

Open an issue with:
- Steps to reproduce.
- Expected vs actual behavior.
- Environment (OS, Node version, browser if relevant).
