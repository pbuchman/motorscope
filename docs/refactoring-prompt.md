# Refactoring Prompt

This is the master prompt used for comprehensive codebase refactoring tasks.

---

You are an advanced, codebase-aware agent with full read/write access to the entire project repository.

The repository is a monorepo with at least two main parts:

- /extension – browser extension / frontend (TypeScript/React, i18n EN/PL).
- /api       – backend API (TypeScript, Firestore, migrations; no i18n layer).

Your job is to perform a coherent, end-to-end refactor across the monorepo that:

1. Cleans up and normalizes i18n in /extension (English canonical, Polish synced).
2. Refactors migrations in /api into dedicated files with a thin orchestrator.
3. Brings tests across /extension and /api to high, behavior-focused coverage (no fluff, no false positives).
4. Leaves the codebase TypeScript-clean and warning-free: no TypeScript errors, no TypeScript suppression hacks added just to hide errors, and no ESLint or other compiler/linter warnings remain (including "shorten import"–style hints).

You must actually modify files in the repo. The final chat response is only a concise summary of what you have done.

-------------------------------------------------------------------------------
GLOBAL RULES
-------------------------------------------------------------------------------

Apply these rules everywhere in the monorepo unless they clearly contradict existing, established conventions.

1. No TypeScript errors, no warning spam

- The TypeScript type-check (for example: tsc or the configured type-check script) must complete with zero errors.
- **Build commands include typecheck**: Both `npm run build` scripts run `npm run lint && npm run typecheck` (extension) or `npm run lint && tsc` (API) before building, so builds will fail on any TypeScript or ESLint error.
- Do not "fix" type problems by sprinkling ts-ignore, ts-expect-error, or by loosening types to any, unknown, or broad unions, unless there is a very strong and explicit reason. Prefer real, correct typing.
- Treat all TypeScript compiler, ESLint, test-runner, and build-time warnings as problems to be fixed.
- This includes "minor" hints like "you can shorten this import", unused imports, implicit any, unreachable code, deprecated APIs, etc.
- When you finish, the project should build, type-check, lint, and run tests with no TypeScript errors and no warnings.
- **Always run `npm run build` before considering a task complete** to ensure both lint and typecheck pass.

2. TypeScript / module style

- Use ESM syntax only: import / export. Do not introduce require() or module.exports.
- Do not introduce new any unless absolutely unavoidable; prefer explicit, accurate types.
- Avoid anti-patterns such as:
  - Throwing an error just to catch it immediately in the same function.
  - Deeply nested promise chains instead of async/await.
  - Copy-pasted code where a reusable utility is obvious.

3. No magic strings, no duplicated logic

- UI text in /extension must be centralized in i18n files (see Part A).
- Repeated logic (for example, status normalization, price history transformations) should be factored into shared utilities where appropriate, without changing behavior.

4. Testing principles

- Tests must be behavior-focused, not written just to inflate coverage numbers.
- Avoid:
  - "Renders without crashing" as the only assertion.
  - Pure snapshot tests that don't guard meaningful behavior.
  - Tests that would still pass if core logic were obviously broken.
- For each test, ask: if I break this logic in a non-trivial way, will this test fail? If not, strengthen the test.

5. Do not change external contracts without reason

- Preserve existing public API shapes (HTTP responses, migration entrypoints, message formats, etc.).
- If structural changes are unavoidable, they must be intentional, minimal, and clearly described in your final summary.

6. Code formatting consistency

Formatting is **enforced at the monorepo level** via:
- **EditorConfig** (`/.editorconfig`) - enforces formatting in WebStorm, VS Code, and other editors
- **ESLint** (`/.eslintrc.json`) - shared rules extended by both `/api` and `/extension`

**Build will fail** if formatting rules are violated: `npm run build` runs `lint → typecheck → compile`.

**Monorepo commands** (run from root):
- `npm run lint` - Lint both projects
- `npm run lint:fix` - Auto-fix both projects  
- `npm run typecheck` - Type-check both projects
- `npm run build` - Build both (includes lint + typecheck)
- `npm run test` - Test both projects

**Rules enforced:**

- **Indentation**: 4 spaces (no tabs) - **ESLint: indent**
- **Import braces**: No spaces inside: `{foo, bar}` not `{ foo, bar }` - **ESLint: object-curly-spacing**
- **Quotes**: Single quotes for imports: `'./types'` not `"./types"` - **ESLint: quotes**
- **Object braces**: No spaces inside for inline: `{foo: 1}` not `{ foo: 1 }` - **ESLint: object-curly-spacing**
- **Trailing commas**: Required in multi-line objects/arrays - **ESLint: comma-dangle**
- **Opening braces**: Same line as statement
- **Arrow functions**: Preferred for callbacks and functional components
- **No trailing whitespace** - **ESLint: no-trailing-spaces**
- **Files end with single newline** - **ESLint: eol-last**


Example of correct formatting:
```typescript
import React, {useCallback, useState} from 'react';
import {useTranslation} from 'react-i18next';

import {CarListing} from '@/types';

const Component: React.FC = () => {
    const {t} = useTranslation('common');
    const [value, setValue] = useState<string>('');

    const handleChange = useCallback((newValue: string) => {
        setValue(newValue);
    }, []);

    return (
        <div className="container">
            {t('label')}
        </div>
    );
};
```

-------------------------------------------------------------------------------
PART A – I18N REFACTOR IN /extension (EN CANONICAL, PL SYNCED)
-------------------------------------------------------------------------------

Note: i18n is only in /extension. Do not introduce i18n to /api.

A1. Discover and align i18n structure

1. Locate i18n initialization and locale files in /extension, for example:
   - locales/en/*.json, locales/pl/*.json, en.json, pl.json, or similar.
   - i18n setup (for example, react-i18next configuration or a custom provider).

2. Identify:
   - How namespaces and keys are organized (for example, nav.logout, dashboard.emptyState.title, errors.listing.missingPrice).
   - Where EN and PL translations live and how they are loaded.

Follow existing conventions; do not invent a completely new i18n architecture.

A2. Remove inline user-facing strings from /extension

1. Traverse /extension (TS/TSX/JS/JSX, templates) and find user-facing strings that:
   - Are currently inlined in components (labels, headings, tooltips, placeholders, modal titles, toasts, etc.).
   - Are not already using i18n (t(), useTranslation(), <Trans>, etc.).
   - Are not purely developer-facing (debug logs, test descriptions, etc.).

2. For each real user-visible string:
   - Decide which namespace/file it belongs to (for example, nav, dashboard, settings, errors).
   - Create a clear, consistent key name (for example, nav.userMenu.logout, not text1).

3. Add the string to the English locale file:
   - If the original English is poor, improve it while keeping the meaning and tone.
   - Preserve placeholders ({name}, {count}, %s, {{variable}}, ICU plurals), HTML/Markdown, and newline characters.

4. Refactor the component to use i18n:
   - Replace inline text with t("your.key") or <Trans i18nKey="your.key" /> according to project patterns.
   - Ensure hooks/imports (useTranslation) and types are correct.

After this step, there should be no user-facing inline texts left in /extension components or hooks.

A3. Ensure Polish translations exist and are consistent

1. For every English key in /extension locales:
   - Verify the corresponding Polish locale file and namespace has the same key.

2. If a PL key is missing:
   - Create it automatically by translating from EN → PL using full project context:
     - Respect component usage (short label versus long description).
     - Preserve placeholders, HTML/Markdown, newline characters.
   - Use consistent Polish terminology for domain concepts across the whole extension.

3. If a PL value is clearly:
   - Still in English,
   - Grammatically wrong,
   - Or inconsistent with terminology,
   then improve it while keeping the original meaning and placeholders.

A4. Self-critical QA for /extension i18n

Before leaving /extension i18n:

- Check that no user-facing inline strings remain.
- Verify that all EN keys have corresponding PL keys.
- Ensure placeholders and formatting match between EN and PL.
- Ensure terminology and tone are consistent across modules.

Fix anything that feels off instead of leaving "probably fine" translations.

-------------------------------------------------------------------------------
PART B – MIGRATION STRUCTURE REFACTOR IN /api (NO I18N)
-------------------------------------------------------------------------------

Note: /api remains English-only. Your changes here are structural and test-related, not about localization.

B1. Discover existing migrations in /api

1. Locate:
   - The main migration entrypoint (for example, src/migrations.ts, src/migrationRunner.ts).
   - Any Migration[] array similar to the example you saw.

2. Understand:
   - The Migration type/interface (for example, { id: string; description?: string; up(db: Firestore): Promise<void>; }).
   - How migrations are invoked (CLI, startup hook, script).

B2. Normalize migrations folder and extract migrations

1. Ensure a dedicated folder exists for migration implementations, for example:
   - /api/src/migrations

2. For each migration object currently inlined in a migrations: Migration[] array:
   - Create a separate file under the migrations folder, following a consistent naming scheme, for example:
       /api/src/migrations/20241209_status_sold_expired_to_ended.ts
       /api/src/migrations/20241209_deduplicate_price_points_per_day.ts
   - Move the entire up logic (and id/description if you export full objects) into that file.
   - Keep logic identical: same queries, batching, logging, and side effects.

Choose one consistent pattern.

Pattern A: export full Migration (conceptual shape; do not copy comments literally)

    export const migration_20241209_status_sold_expired_to_ended: Migration = {
      id: "20241209_status_sold_expired_to_ended",
      description: "Migrate listing statuses from sold/expired to ENDED",
      up: async (db: Firestore) => {
        // original logic
      },
    };

Pattern B: export up() and construct Migration in main module

    export async function up(db: Firestore): Promise<void> {
      // original logic
    }

Use whichever fits the existing style better, but be consistent across migrations.

B3. Make the main migration module orchestration-only

In the main migration file:

1. Remove all inline migration logic.
2. Import the migration definitions from /api/src/migrations/*.
3. Construct the migrations: Migration[] array in the correct order and export it.
4. Ensure any public entrypoint (for example, runMigrations(db)) is preserved and still uses these migrations.

The main module should now only orchestrate and log; it should not contain any Firestore update logic.

B4. Self-critical QA for /api migrations

- Confirm every previously existing migration now has its own file.
- Confirm the main module correctly imports and sequences them.
- Confirm external invocation (CLI/startup) still works.
- If there is duplicated helper logic across migration files, consolidate it into shared utilities where appropriate, without changing behavior.

-------------------------------------------------------------------------------
PART C – TESTS ACROSS /extension AND /api (HIGH COVERAGE, NO FLUFF)
-------------------------------------------------------------------------------

Your goal is to bring tests to high, behavior-focused coverage for both /extension and /api. "Full coverage" here means:

- No important module or branch is left untested.
- All critical flows are covered by tests that would fail on real regressions.
- There are no obviously useless tests.

C1. Understand and use existing test setup

1. Determine for each part:
   - /extension: which runner (Jest, Vitest, etc.) and libraries (React Testing Library, Cypress/Playwright, etc.) are in use, and where tests live (for example, *.test.tsx, __tests__).
   - /api: which runner and structure (unit vs integration, Firestore emulator or mocks) are in use.

2. Reuse existing helpers, factories, render utilities, and mocks. Extend them if needed; do not bypass them with ad-hoc patterns.

C2. Identify coverage gaps

For both /extension and /api:

- Identify completely untested modules.
- Identify modules with thin or obviously superficial tests.
- Pay special attention to:
  - Core user flows in /extension (auth, dashboard, listings, settings, language behavior, background worker interactions).
  - Core business logic in /api (listing status, price history, key services).
  - Migrations in /api (data-changing logic).
  - Background service worker and zero-coverage UI components if they exist.

Use coverage tooling if available to confirm:

- Files with 0% or near-0% coverage.
- Branches that are never exercised.

C3. Write meaningful tests for /extension

Cover at least:

- Background service worker:
  - Mock Chrome APIs used by the background script (for example, chrome.runtime, chrome.tabs, chrome.storage, chrome.alarms).
  - Provide helpers to trigger events like onMessage, onInstalled, onAlarm.
  - Test message routing, storage updates, scheduled tasks, and tab-related behavior.

- UI components and screens:
  - Use React Testing Library and shared test utilities to render components with providers (router, state, i18n).
  - Test:
    - Initial states (loading, empty, default).
    - User interactions (clicks, typing, toggles, form submissions).
    - Conditional rendering (different states based on props/data).
    - Integrations with background and storage (via mocked Chrome APIs).
  - Focus on popup, dashboard/views, settings/options, and key shared components.

- Hooks and utilities:
  - Unit test pure utilities thoroughly.
  - Test custom hooks' behavior with appropriate testing utilities, verifying state transitions and side effects.

Avoid tests that only assert "renders" without checking useful behavior.

C4. Write meaningful tests for /api

For /api:

- Business logic and services:
  - Test main paths and important edge cases:
    - Correct outputs and state changes for valid inputs.
    - Behavior on invalid/missing data.
    - Error handling (correct exceptions or error objects).
  - Focus on:
    - Listing status rules.
    - Price history and other core data transformations.

- HTTP endpoints (if present):
  - For each significant endpoint, issue requests (unit or integration level) and assert:
    - Status codes.
    - Response body shape and key fields.
    - Auth/validation behavior for good and bad inputs.

- Migrations:
  - For each migration file:
    - Set up realistic initial Firestore data.
    - Run the migration's up() function.
    - Assert on resulting data:
      - Status normalization: old statuses (for example, sold, expired, different cases) become ENDED; others remain unchanged.
      - Price history deduplication: multiple entries per day are reduced to the last one per day; ordering across days is preserved; no change for zero or one entry.
    - Include edge cases (empty collections, missing fields, unexpected shapes where realistic).

Tests must assert on data outcomes and user-visible effects, not just that some function was called.

C5. Guard against false positives

For all new or changed tests:

- Ask explicitly: if I break the underlying logic in a non-trivial way, would this test fail?
  - If the answer is "probably not", strengthen the test.
- Avoid:
  - Snapshot-only tests that lock DOM structure without semantics.
  - Overly mocked tests that verify only mocks, not behavior.
  - Assertions that can never realistically fail.

Prefer assertions on:

- What the user sees and does (for /extension).
- Domain-level outcomes and data changes (for /api).

C6. Keep tests and tools healthy

- Ensure all tests pass reliably (no flakes).
- Ensure test commands integrate cleanly with build scripts.
- Fix any test-related warnings (deprecated APIs, unused variables, etc.) as part of the "no warnings" rule.
- If some very rare edge cases are too complex to simulate realistically, document them in comments and in your final summary rather than adding meaningless tests.

-------------------------------------------------------------------------------
PART D – FINAL QA AND SUMMARY
-------------------------------------------------------------------------------

Before you consider the job done:

1. Build, type-check, lint, and test the monorepo:
   - The TypeScript type-check must report zero errors.
   - The linter and test runner must report no warnings and no errors.

2. Re-inspect:
   - /extension:
     - i18n: no inline user strings, EN/PL keys in sync, placeholders intact.
     - Tests: key flows, background worker, and important components covered with meaningful assertions.
   - /api:
     - Migrations: one file per migration under the migrations folder, orchestrator is thin.
     - Business logic and migrations: tested with realistic scenarios and edge cases.

3. If you spot anything ambiguous, fragile, or obviously improvable, fix it rather than leaving it for later.

-------------------------------------------------------------------------------
PART E – WHAT TO OUTPUT IN THE CHAT
-------------------------------------------------------------------------------

Your final response in this conversation should not include entire code or test files.

Provide a concise Markdown summary including:

1. Overview
   - 5–10 sentences describing:
     - What you changed in /extension i18n.
     - How you refactored migrations in /api.
     - How you improved tests across /extension and /api.
     - Confirmation that the repo builds, type-checks, lints, and tests with zero TypeScript errors and no warnings.

2. Key changes (high level)
   - Main locale files touched (EN/PL).
   - Main components/hooks/services you refactored and covered with tests.
   - Migration orchestrator file path and examples of migration files you created.
   - Notable new or updated test suites.

3. Representative examples (short snippets, not full files)
   - A before/after example of an inline string replaced by i18n.
   - A migration that moved from inline to a dedicated file.
   - A representative test from /extension and one from /api that show non-trivial behavior being asserted.

4. Risks, assumptions, and follow-ups
   - Any areas where you had to make assumptions and where a human should review semantics.
   - Any rare edge cases that are documented but not fully covered by tests and why.
   - Anything else a maintainer should know before merging these changes.

All substantial work happens in the repository; the chat response is only the high-level report of your refactor and test coverage pass across /extension and /api.

