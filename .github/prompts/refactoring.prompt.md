You are a senior, codebase-aware engineering agent with full read/write access to the entire repository.
You operate at the repository root level.

Your task is to perform a **full, coherent refactor and quality pass** across the whole repository.
This is not a cosmetic change. Treat this as production-grade engineering work.

================================================================================
REPOSITORY STRUCTURE
================================================================================

```
/extension    — Chrome extension frontend (TypeScript, React, i18n EN/PL)
/api          — Backend API (TypeScript, Express, Firestore, migrations)
/terraform    — Infrastructure as Code (GCP resources)
/scripts      — Shell scripts (automation, verification)
/docs         — Technical documentation
```

================================================================================
GLOBAL NON-NEGOTIABLE RULES
================================================================================

Applies to: all code

1. ZERO TypeScript errors (`/extension`, `/api`)
- The project must pass `tsc` with zero errors.
- Do NOT hide problems using `@ts-ignore`, `@ts-expect-error`, unsafe casts, or loosening types.
- `any` is forbidden unless there is no realistic alternative and it is justified inline.

2. ZERO warnings (all code)
- No ESLint warnings.
- No TS warnings.
- No test warnings.
- No "minor" hints (unused imports, import can be shortened, unreachable code, deprecated APIs).
  If the tooling reports it, you fix it.

3. Modern module discipline (`/extension`, `/api`)
- ESM only: `import` / `export`.
- No `require`, no `module.exports`.
- No mixed module systems.

4. No fluff, no lies
- No useless tests.
- No fake coverage.
- No claiming "done" unless verified.
- If something cannot be tested reasonably, document why and move on.

================================================================================
PART A — I18N (EXTENSION ONLY)
================================================================================

Applies to: `/extension` only

i18n exists ONLY in `/extension`. Do not add translations to `/api`.

A1. Canonical language
- English is the canonical source of truth.
- Every EN key must exist in PL.
- Keys, structure, and placeholders must match exactly.

A2. Remove inline UI strings
- Scan the entire `/extension` codebase.
- Any user-facing string (labels, buttons, tooltips, empty states, errors, menus) must be moved to i18n.
- No magic strings remain in components, hooks, or background logic.

A3. Polish translations
- For every EN key:
    - Ensure a Polish translation exists.
    - Translate using full product context, not word-by-word.
    - Preserve placeholders, ICU rules, and formatting.
- Fix broken or half-English Polish entries.

A4. QA pass
Before finishing i18n:
- Verify no inline UI strings exist.
- Verify EN ↔ PL parity.
- Verify placeholders and formatting.
- Verify consistent terminology across the app.

================================================================================
PART B — API ARCHITECTURE
================================================================================

Applies to: `/api`

/api has NO i18n. Focus on structure and correctness.

B1. Route organization
- Routes live in `/api/src/routes.ts` or split by domain if large.
- Each route must have proper error handling.
- Use consistent response formats.

B2. Authentication
- Auth logic lives in `/api/src/auth.ts`.
- Token validation must be centralized.
- Never expose sensitive data in responses.

B3. Database access
- Firestore access is centralized in `/api/src/db.ts`.
- Use typed document references.
- Batch operations where appropriate.

B4. Migration extraction
- All migrations must live in `/api/src/migrations/`.
- One migration = one file.
- No migration logic remains inline in orchestration files.

B5. Migration patterns (choose ONE and apply consistently)

Pattern A:
- Each file exports a full `Migration` object.

Pattern B:
- Each file exports `up()` (and optional helpers).
- The main module constructs `Migration` objects.

Be consistent across all migrations.

B6. Orchestrator
- The main migration module:
    - Imports migrations.
    - Orders them.
    - Executes them.
- No Firestore update logic lives there.

B7. Migration quality
- Migrations must be:
    - Idempotent.
    - Batch-safe.
    - Logged.
    - Tested.
- Shared logic may be extracted into helpers if duplicated.

B8. API documentation
- Swagger definitions in `/api/src/swagger.ts`.
- Keep OpenAPI spec in sync with actual endpoints.

================================================================================
PART C — EXTENSION ARCHITECTURE
================================================================================

Applies to: `/extension`

C1. Service organization
- Services in `/extension/src/services/` handle external interactions.
- Each service should be independently testable.
- Use dependency injection where practical.

C2. Component structure
- Components in `/extension/src/components/`.
- Extract reusable UI to `/extension/src/components/ui/`.
- Keep components focused and small.

C3. State management
- Context providers in `/extension/src/context/`.
- Hooks in `/extension/src/hooks/`.
- Avoid prop drilling beyond 2 levels.

C4. Background service worker
- Entry point: `/extension/src/background.ts`.
- Message handlers must be typed.
- Alarms and scheduled jobs must be testable.

C5. Content scripts
- Live in `/extension/src/content-scripts/`.
- Shared utilities in `/extension/src/content-scripts/shared/`.
- Follow the testing strategy in Part D.

================================================================================
PART D — TESTING (EXTENSION + API)
================================================================================

Applies to: `/extension`, `/api`

Goal: **maximum reasonable coverage**, not theoretical 100%.

D1. What MUST be tested

**`/extension`:**
- Background service worker (Chrome APIs mocked).
- Message routing.
- Storage interactions.
- Scheduled jobs / alarms.
- Non-trivial UI components.
- Hooks and shared logic.
- **Content scripts shared modules** (pure functions extracted for testability).

**`/api`:**
- Core business logic.
- Data transformations (e.g. price history).
- Auth flows.
- HTTP endpoints (routes).
- **ALL migrations**.
- Utility functions.

D2. What is explicitly FORBIDDEN
- "renders without crashing" tests.
- Snapshot-only tests.
- Tests that only assert mocks were called.
- Tests that would still pass after breaking real logic.

D3. Mocking rules
- Mock external systems properly:
    - Chrome APIs.
    - Firestore (emulator or structured mocks).
    - Network calls.
- Do not mock away the system under test.

D4. Coverage verification
- Use coverage tooling to identify:
    - 0% files.
    - Untested branches.
- Increase coverage where it protects behavior.
- Leave trivial presentational components untested if justified.

D5. Tests must fail on regressions
For every test, ask:
"If I break this logic in a realistic way, does the test fail?"
If not, strengthen or delete the test.

D6. Content script testing strategy
Content scripts have limited testability due to DOM/Chrome API dependencies.

**Required approach:**
1. **Extract pure functions** into `content-scripts/shared/` modules:
   - URL utilities (normalize, validate, detect page type)
   - Phone number utilities (clean, validate)
   - DOM utilities (find buttons, debounce, observers)
   - React fiber utilities (search, extract props)
   - Logger factory

2. **Test shared modules thoroughly** (target 90%+ line coverage):
   - All branches in conditional logic
   - Edge cases: null, undefined, empty strings, malformed data
   - Type coercion edge cases

3. **Avoid window.location dependencies**:
   - Extract pure functions: `isListingUrl(url)` vs `isListingPage()`
   - Test the pure version, wrapper is trivial

4. **Integration code** (DOM manipulation, Chrome messaging):
   - Test structure and setup (observer config, element structure)
   - Skip runtime behavior that requires browser environment

5. **MutationObserver testing**:
   - Test observer creation and configuration
   - Skip callback testing (jsdom limitations)
   - Document untested paths

D7. Shared module coverage targets
For extracted shared utilities (both `/extension` and `/api`):
- **90%+ line coverage** for pure functions
- **Test all branches** in conditional logic
- **Test edge cases**: null/undefined inputs, empty strings, malformed data

================================================================================
PART E — INFRASTRUCTURE
================================================================================

Applies to: `/terraform`

E1. Module organization
- Reusable modules in `/terraform/modules/`.
- Environment-specific configs in `/terraform/environments/`.

E2. Conventions
- Use descriptive resource names.
- Tag all resources appropriately.
- Document non-obvious configurations.
- Keep secrets out of version control.

E3. Changes
- Plan before apply.
- Document infrastructure changes in commit messages.
- Coordinate with application changes when needed.

================================================================================
PART F — SCRIPTS
================================================================================

Applies to: `/scripts`

- Use `#!/bin/bash` or `#!/bin/zsh` shebang.
- Include error handling (`set -e`).
- Document script purpose at the top.
- Use meaningful exit codes.
- Prefer portable shell constructs.

================================================================================
PART G — DOCUMENTATION
================================================================================

Applies to: `/docs`

- Keep documentation up to date with code changes.
- Use Markdown format.
- Include diagrams where helpful.
- Document decisions and trade-offs, not just "what".

================================================================================
PART H — NO MAGIC, NO DUPLICATION
================================================================================

Applies to: all code

- No magic strings in logic.
- No copy-pasted logic where a shared utility is appropriate.
- Refactor duplicated behavior into shared helpers **without changing behavior**.

================================================================================
PART I — EXTERNAL CONTRACTS
================================================================================

Applies to: `/extension`, `/api`

- Do not change public API contracts casually:
    - HTTP responses
    - message formats
    - migration entrypoints
- If a contract change is unavoidable:
    - make it explicit
    - keep it minimal
    - document it

================================================================================
PART J — FINAL VERIFICATION
================================================================================

Before responding:

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

If something is ambiguous or risky:
- Make a reasonable decision.
- Document it in the summary.

================================================================================
PART K — OUTPUT
================================================================================

Do NOT paste full files.

Respond with:
1. Overview of changes.
2. Key areas refactored.
3. Tests added and why they matter.
4. Migration restructuring summary.
5. Risks, assumptions, and follow-ups.

All real work happens in the repository.
