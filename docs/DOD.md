# Definition of Done (DoD)

To ensure consistent quality across the "Finanzas Restaurante" project, every task or feature must meet the following criteria before being considered **DONE**.

## 1. Functionality & Logic

- [ ] **Acceptance Criteria**: All requirements defined in the ticket/issue are met.
- [ ] **Edge Cases**: Handled zero values, empty states, and potential errors (e.g., API failures).
- [ ] **User Feedback**: UI provides clear feedback for actions (loading, success, error toasts).

## 2. Code Quality

- [ ] **Linting**: No linting errors (`npm run lint` passes).
- [ ] **No `any`**: TypeScript types are strict. No implicit or explicit `any` without a *very* good reason and comment.
- [ ] **Clean Code**:
  - No `console.log` left in production code.
  - No commented-out dead code.
  - Variable/Function names are descriptive (English).
- [ ] **Separation of Concerns**: Logic extracted to hooks/utils; Components focused on UI.

## 3. Testing

- [ ] **Unit Tests**: Critical business logic (math, parsers) has passing unit tests.
- [ ] **Regression**: Existing tests pass (`npm test`).
- [ ] **Manual Check**: Feature verified in a local dev environment.

## 4. Architecture & Assets

- [ ] **File Structure**: Files placed in the correct module folder (feature-based).
- [ ] **Assets**: Images/Icons optimized and properly imported.
- [ ] **Dependencies**: No unused packages added.

## 5. Documentation

- [ ] **Module Map**: If a new module was added, update `README.md`.
- [ ] **Comments**: Complex logic explained with "Why", not "What".

---
*If a shortcut is taken due to urgency, it MUST be logged as a "Technical Debt" ticket immediately.*
