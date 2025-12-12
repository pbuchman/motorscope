# Coding Instructions (v2)

These rules apply to **all code changes** performed by an LLM in this repository.
They are not suggestions. They are constraints.

The repository is a monorepo with:
- `/extension` — Chrome extension frontend (TypeScript, React, i18n EN/PL)
- `/api` — backend API (TypeScript, Firestore, migrations)

---

## 1. TypeScript correctness is mandatory

- The codebase must compile with **zero TypeScript errors**.
- Do **not** hide problems using:
    - `@ts-ignore`
    - `@ts-expect-error`
    - unsafe casts
    - loosening types to `any` or `unknown`
- `any` is forbidden unless there is **no realistic alternative** and the reason is documented inline.
- Prefer explicit, narrow types over broad unions.

---

## 2. No warnings, ever

- No TypeScript warnings.
- No ESLint warnings.
- No test runner warnings.
- No “minor” hints:
    - unused imports
    - unused variables
    - deprecated APIs
    - import path shortening suggestions
- If tooling reports it, you fix it.

---

## 3. Module system and imports

- Use **ESM only**: `import` / `export`.
- Do not introduce `require()` or `module.exports`.
- Do not mix module systems.
- Prefer clean, readable imports:
    - Use path aliases or barrel files if available.
    - Avoid long relative paths.
- Remove duplicated or inconsistent import styles.

---

## 4. i18n rules (extension only)

- **i18n exists only in `/extension`.**
- `/api` must never contain translations.

In `/extension`:
- No user-facing inline strings are allowed.
- All UI text must come from i18n.
- English is the **single source of truth**.
- Every English key **must** exist in Polish.
- Keys, structure, placeholders, and formatting must match exactly.
- Placeholders (`{count}`, `{name}`, ICU rules, etc.) must be preserved.
- Polish translations must be:
    - complete
    - grammatically correct
    - context-aware
- Fix half-translated or English leftovers immediately.

---

## 5. Testing philosophy

The goal is **maximum reasonable coverage**, not artificial 100%.

### Forbidden test types
- “renders without crashing”
- snapshot-only tests
- tests that only assert mocks were called
- tests that would pass even if real logic was broken

### Required properties of tests
- Tests must assert **observable behavior**.
- Tests must fail on **realistic regressions**.
- Over-mocking is not allowed.
- External systems must be mocked properly:
    - Chrome extension APIs
    - Firestore (emulator or structured mocks)
    - network calls

### Coverage expectations
- `/extension`:
    - background service worker
    - message routing
    - storage interactions
    - scheduled jobs
    - non-trivial UI components
    - hooks and shared logic
- `/api`:
    - business logic
    - data transformations
    - auth flows
    - HTTP endpoints
    - **all migrations**

Trivial presentational components may remain untested **only if justified**.

---

## 6. Migration architecture (API only)

- All migrations live in `/api/src/migrations`.
- One migration = one file.
- The main migration module:
    - imports migrations
    - orders them
    - executes them
- No migration logic in the orchestrator.

Migrations must be:
- idempotent
- batch-safe
- logged
- tested

Choose one migration export pattern and apply it consistently.

---

## 7. UI behavior changes (extension)

When modifying UI behavior:
- Preserve existing functionality unless explicitly instructed otherwise.
- State changes must be persisted if they affect user settings.
- UI logic changes must be tested.
- If a behavior requires reload or reinitialization, document it.

---

## 8. No magic, no duplication

- No magic strings in logic.
- No copy-pasted logic where a shared utility is appropriate.
- Refactor duplicated behavior into shared helpers **without changing behavior**.

---

## 9. External contracts

- Do not change public API contracts casually:
    - HTTP responses
    - message formats
    - migration entrypoints
- If a contract change is unavoidable:
    - make it explicit
    - keep it minimal
    - document it

---

## 10. Honesty and verification

- Do not claim work is complete unless it actually is.
- Do not bluff about coverage, correctness, or verification.
- If something is ambiguous or risky:
    - make a reasonable decision
    - document it

---

## 11. Final verification before completion

Before finishing any task:
- Build passes.
- Type-check passes.
- Lint passes.
- Tests pass.
- Zero warnings remain.

If any of these fail, the task is not complete.
