You are a senior, codebase-aware engineering agent with full read/write access to the entire repository.
You operate at the repository root level.

The project is a monorepo consisting of:

- /extension — Chrome extension frontend (TypeScript, React, background service worker, i18n EN/PL)
- /api — backend API (TypeScript, Firestore, migrations, no i18n)

Your task is to perform a **full, coherent refactor and quality pass** across the whole repository.
This is not a cosmetic change. Treat this as production-grade engineering work.

================================================================================
GLOBAL NON-NEGOTIABLE RULES
================================================================================

1. ZERO TypeScript errors
- The project must pass `tsc` with zero errors.
- Do NOT hide problems using `@ts-ignore`, `@ts-expect-error`, unsafe casts, or loosening types.
- `any` is forbidden unless there is no realistic alternative and it is justified inline.

2. ZERO warnings
- No ESLint warnings.
- No TS warnings.
- No test warnings.
- No “minor” hints (unused imports, import can be shortened, unreachable code, deprecated APIs).
  If the tooling reports it, you fix it.

3. Modern module discipline
- ESM only: `import` / `export`.
- No `require`, no `module.exports`.
- No mixed module systems.

4. No fluff, no lies
- No useless tests.
- No fake coverage.
- No claiming “done” unless verified.
- If something cannot be tested reasonably, document why and move on.

================================================================================
PART A — I18N (EXTENSION ONLY)
================================================================================

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
PART B — API MIGRATIONS (STRUCTURE ONLY)
================================================================================

/api has NO i18n. Focus on structure and correctness.

B1. Migration extraction
- All migrations must live in `/api/src/migrations`.
- One migration = one file.
- No migration logic remains inline in orchestration files.

B2. Allowed patterns (choose ONE and apply consistently)

Pattern A:
- Each file exports a full `Migration` object.

Pattern B:
- Each file exports `up()` (and optional helpers).
- The main module constructs `Migration` objects.

Be consistent across all migrations.

B3. Orchestrator
- The main migration module:
    - Imports migrations.
    - Orders them.
    - Executes them.
- No Firestore update logic lives there.

B4. Migration quality
- Migrations must be:
    - Idempotent.
    - Batch-safe.
    - Logged.
- Shared logic may be extracted into helpers if duplicated.

================================================================================
PART C — TESTING (EXTENSION + API)
================================================================================

Goal: **maximum reasonable coverage**, not theoretical 100%.

C1. What MUST be tested

/extension:
- Background service worker (Chrome APIs mocked).
- Message routing.
- Storage interactions.
- Scheduled jobs / alarms.
- Non-trivial UI components.
- Hooks and shared logic.

/api:
- Core business logic.
- Data transformations (e.g. price history).
- Auth flows.
- HTTP endpoints (where present).
- ALL migrations.

C2. What is explicitly FORBIDDEN
- “renders without crashing” tests.
- Snapshot-only tests.
- Tests that only assert mocks were called.
- Tests that would still pass after breaking real logic.

C3. Mocking rules
- Mock external systems properly:
    - Chrome APIs.
    - Firestore (emulator or structured mocks).
    - Network calls.
- Do not mock away the system under test.

C4. Coverage verification
- Use coverage tooling to identify:
    - 0% files.
    - Untested branches.
- Increase coverage where it protects behavior.
- Leave trivial presentational components untested if justified.

C5. Tests must fail on regressions
For every test, ask:
“If I break this logic in a realistic way, does the test fail?”
If not, strengthen or delete the test.

================================================================================
PART D — UI CHANGE (EXTENSION)
================================================================================

Replace the logout button with a dropdown menu:

- Option 1: Logout
    - Same behavior as current logout.
- Option 2: Language selector
    - English / Polish (flags optional).
    - Default: English.
    - Persisted in user settings.
    - Applied on reload or re-render (document behavior if reload required).

Add tests for the dropdown logic.

================================================================================
PART E — FINAL VERIFICATION
================================================================================

Before responding:

- Build passes.
- Type-check passes.
- Lint passes.
- Tests pass.
- No warnings anywhere.

If something is ambiguous or risky:
- Make a reasonable decision.
- Document it in the summary.

================================================================================
PART F — OUTPUT
================================================================================

Do NOT paste full files.

Respond with:
1. Overview of changes.
2. Key areas refactored.
3. Tests added and why they matter.
4. Migration restructuring summary.
5. Risks, assumptions, and follow-ups.

All real work happens in the repository.
