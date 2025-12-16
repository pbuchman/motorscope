# Coding Instructions (v2)

These rules apply to **all code changes** performed by an LLM in this repository.
They are not suggestions. They are constraints.

---

## Repository Structure

```
/extension    — Chrome extension frontend (TypeScript, React, i18n EN/PL)
/api          — Backend API (TypeScript, Express, Firestore, migrations)
/terraform    — Infrastructure as Code (GCP resources)
/scripts      — Shell scripts (automation, verification)
/docs         — Technical documentation
```

---

## 1. TypeScript correctness is mandatory

Applies to: `/extension`, `/api`

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

Applies to: all code

- No TypeScript warnings.
- No ESLint warnings.
- No test runner warnings.
- No "minor" hints:
    - unused imports
    - unused variables
    - deprecated APIs
    - import path shortening suggestions
- If tooling reports it, you fix it.

---

## 3. Module system and imports

Applies to: `/extension`, `/api`

- Use **ESM only**: `import` / `export`.
- Do not introduce `require()` or `module.exports`.
- Do not mix module systems.
- Prefer clean, readable imports:
    - Use path aliases or barrel files if available.
    - Avoid long relative paths.
- Remove duplicated or inconsistent import styles.

---

## 4. i18n rules

Applies to: `/extension` only

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

Applies to: `/extension`, `/api`

The goal is **maximum reasonable coverage**, not artificial 100%.

### Forbidden test types
- "renders without crashing"
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

**`/extension`:**
- background service worker
- message routing
- storage interactions
- scheduled jobs
- non-trivial UI components
- hooks and shared logic
- **content scripts shared modules** (pure functions, utilities)

**`/api`:**
- business logic
- data transformations
- auth flows
- HTTP endpoints (routes)
- **all migrations**
- utility functions

### Content script testing strategy (extension)

Content scripts have limited testability due to DOM/Chrome API dependencies.
Apply this pattern:

1. **Extract pure functions** into `content-scripts/shared/` modules:
   - URL utilities (normalize, validate, detect page type)
   - Phone number utilities (clean, validate)
   - DOM utilities (find buttons, debounce, observers)
   - React fiber utilities (search, extract props)
   - Logger factory

2. **Test shared modules thoroughly** — these contain the testable logic.

3. **Integration code** (DOM manipulation, Chrome messaging):
   - Test structure and setup (observer config, element structure)
   - Skip runtime behavior that requires browser environment

4. **Avoid window.location dependencies**:
   - Extract pure functions: `isListingUrl(url)` vs `isListingPage()`
   - Test the pure version, wrapper is trivial

5. **MutationObserver testing**:
   - Test observer creation and configuration
   - Skip callback testing (jsdom limitations)
   - Document untested paths

### Shared module coverage targets

For extracted shared utilities (both `/extension` and `/api`):
- **90%+ line coverage** for pure functions
- **Test all branches** in conditional logic
- **Test edge cases**: null/undefined inputs, empty strings, malformed data

Trivial presentational components may remain untested **only if justified**.

---

## 6. API architecture (`/api`)

### Route organization
- Routes live in `/api/src/routes.ts` or split by domain if large.
- Each route must have proper error handling.
- Use consistent response formats.

### Authentication
- Auth logic lives in `/api/src/auth.ts`.
- Token validation must be centralized.
- Never expose sensitive data in responses.

### Database access
- Firestore access is centralized in `/api/src/db.ts`.
- Use typed document references.
- Batch operations where appropriate.

### Migrations
- All migrations live in `/api/src/migrations/`.
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

### API documentation
- Swagger definitions in `/api/src/swagger.ts`.
- Keep OpenAPI spec in sync with actual endpoints.

---

## 7. Extension architecture (`/extension`)

### Service organization
- Services in `/extension/src/services/` handle external interactions.
- Each service should be independently testable.
- Use dependency injection where practical.

### Component structure
- Components in `/extension/src/components/`.
- Extract reusable UI to `/extension/src/components/ui/`.
- Keep components focused and small.

### State management
- Context providers in `/extension/src/context/`.
- Hooks in `/extension/src/hooks/`.
- Avoid prop drilling beyond 2 levels.

### Background service worker
- Entry point: `/extension/src/background.ts`.
- Message handlers must be typed.
- Alarms and scheduled jobs must be testable.

### Content scripts
- Live in `/extension/src/content-scripts/`.
- Shared utilities in `/extension/src/content-scripts/shared/`.
- Follow the testing strategy in Section 5.

---

## 8. Infrastructure (`/terraform`)

Applies to: `/terraform`

### Module organization
- Reusable modules in `/terraform/modules/`.
- Environment-specific configs in `/terraform/environments/`.

### Conventions
- Use descriptive resource names.
- Tag all resources appropriately.
- Document non-obvious configurations.
- Keep secrets out of version control.

### Changes
- Plan before apply.
- Document infrastructure changes in commit messages.
- Coordinate with application changes when needed.

---

## 9. Scripts (`/scripts`)

Applies to: `/scripts`

- Use `#!/bin/bash` or `#!/bin/zsh` shebang.
- Include error handling (`set -e`).
- Document script purpose at the top.
- Use meaningful exit codes.
- Prefer portable shell constructs.

---

## 10. Documentation (`/docs`)

Applies to: `/docs`

- Keep documentation up to date with code changes.
- Use Markdown format.
- Include diagrams where helpful.
- Document decisions and trade-offs, not just "what".

---

## 11. No magic, no duplication

Applies to: all code

- No magic strings in logic.
- No copy-pasted logic where a shared utility is appropriate.
- Refactor duplicated behavior into shared helpers **without changing behavior**.

---

## 12. External contracts

Applies to: `/extension`, `/api`

- Do not change public API contracts casually:
    - HTTP responses
    - message formats
    - migration entrypoints
- If a contract change is unavoidable:
    - make it explicit
    - keep it minimal
    - document it

---

## 13. Honesty and verification

- Do not claim work is complete unless it actually is.
- Do not bluff about coverage, correctness, or verification.
- If something is ambiguous or risky:
    - make a reasonable decision
    - document it

---

## 14. Final verification before completion

Before finishing any task:

**For `/extension` and `/api`:**
- Build passes.
- Type-check passes.
- Lint passes.
- Tests pass.
- Zero warnings remain.

**For `/terraform`:**
- `terraform fmt` passes.
- `terraform validate` passes.
- Plan reviewed if applicable.

**For `/scripts`:**
- Script is executable.
- Shellcheck passes (if available).

**For `/docs`:**
- Markdown renders correctly.
- Links are valid.

If any of these fail, the task is not complete.
