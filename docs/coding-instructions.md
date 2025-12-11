# Coding Instructions

Guidelines for making code changes in the MotorScope project.

For comprehensive refactoring tasks, see [refactoring-prompt.md](./refactoring-prompt.md).

---

## General Principles

1. **Zero errors, zero warnings**: TypeScript type-check must complete with zero errors. Treat all compiler, ESLint, and build-time warnings as problems to fix.
2. **Always validate changes**: After editing a file, check for TypeScript errors and fix them before moving on.
3. **Build and test**: Run `npm run build` and `npm test` to verify changes.
4. **No suppression hacks**: Do not use `ts-ignore`, `ts-expect-error`, or loosen types to `any`/`unknown` just to hide errors.

---

## TypeScript / Module Style

### ESM Only

- Use `import` / `export` syntax only
- Do not introduce `require()` or `module.exports`

### Import Paths

- Use the `@/` path alias instead of relative paths when importing from deep directories
- Example: Use `@/types` instead of `../../types`
- The alias is configured in `tsconfig.json` as `"@/*": ["./src/*"]`
- Fix "shorten import" warnings by using the alias

### Typing

- Do not introduce `any` unless absolutely unavoidable
- Prefer explicit, accurate types
- Fix implicit `any` warnings

### Avoid These Anti-Patterns

1. **Throwing exceptions caught locally**
   ```typescript
   // ❌ Bad - throw inside try block that catches it
   try {
     if (!data) throw new Error('No data');
     // ... more logic
   } catch (error) {
     throw new Error('Operation failed');
   }
   
   // ✅ Good - restructure control flow
   if (!data) {
     throw new Error('No data');
   }
   try {
     // only external operations that can fail
   } catch (error) {
     throw new Error('Operation failed');
   }
   ```

2. **Redundant local variables**
   ```typescript
   // ❌ Bad
   const result = someFunction();
   return result;
   
   // ✅ Good
   return someFunction();
   ```

3. **Unused variables/imports**
   - Remove any declared but unused variables
   - Use `_` prefix for intentionally unused parameters (e.g., `_sender`)

4. **Deeply nested promise chains**
   - Use `async/await` instead of `.then()` chains

5. **Copy-pasted code**
   - Factor repeated logic into shared utilities

---

## No Magic Strings

- UI text in `/extension` must be centralized in i18n files
- Repeated logic (status normalization, price history transforms) should be in shared utilities

---

## Export Patterns

### Migrations (API)

Use default exports with a `Migration` object:

```typescript
import type { Migration } from './types.js';

const migration: Migration = {
  id: 'YYYYMMDD_description',
  description: 'Human readable description',
  up: async (db) => {
    // migration logic
  },
};

export default migration;
```

Then import in the registry (`/api/src/migrations/index.ts`):

```typescript
import myMigration from './YYYYMMDD_description.js';

export const migrations: Migration[] = [
  myMigration,
];
```

The main migration module (`/api/src/migrations.ts`) should be orchestration-only - no inline Firestore logic.

### Components and Services (Extension)

- Use named exports for most modules
- Use default exports only for top-level page components

---

## i18n (Extension Only)

- All user-facing strings must use i18n (`t()`, `useTranslation()`, `<Trans>`)
- English is canonical; Polish must be synced
- No inline user-visible text in components
- Preserve placeholders (`{name}`, `{{variable}}`, etc.) in translations

---

## Testing Principles

Tests must be **behavior-focused**, not written to inflate coverage:

- ❌ Avoid "renders without crashing" as the only assertion
- ❌ Avoid pure snapshot tests that don't guard meaningful behavior
- ❌ Avoid tests that pass even if core logic is broken
- ✅ For each test, ask: "If I break this logic, will this test fail?"
- ✅ Assert on user-visible outcomes and data changes

---

## CSS

- Remove unused CSS selectors
- Use Tailwind classes instead of custom CSS when possible

---

## Documentation

- Keep `/docs` folder clean - remove investigation/issue files once resolved
- Update documentation when changing related code
- Markdown files with code examples will show IDE "errors" - these are false positives

---

## Project-Specific Notes

### Extension (`/extension`)

- Background service worker: `src/background.ts`
- Auth: `chrome.identity.getAuthToken()` for Google OAuth
- Session storage: `chrome.storage.session` for runtime state
- i18n: EN/PL locales, react-i18next
- Backend API: used for persistent data (listings, settings)

### API (`/api`)

- Express backend with Firestore database
- JWT tokens include `jti` for blacklist support
- Migrations: one file per migration in `/api/src/migrations/`, run on startup
- No i18n layer - English only

---

## Before Committing

1. **Build both projects** (must pass with no errors):
   ```bash
   cd api && npm run build
   cd extension && npm run build
   ```

2. **Run tests** (must pass with no warnings):
   ```bash
   cd api && npm test
   cd extension && npm test
   ```

3. **Check for TypeScript errors** in IDE

4. **Verify no warnings** - including:
   - Unused imports/variables
   - "Shorten import" hints
   - Deprecated API usage
   - Implicit any

---

## Summary of Rules

At the end of each task, verify:

- [ ] Zero TypeScript errors
- [ ] Zero warnings (compiler, linter, tests)
- [ ] No `ts-ignore` or `any` hacks added
- [ ] Import paths use `@/` alias where applicable
- [ ] No unused variables or imports
- [ ] Tests are behavior-focused
- [ ] i18n strings in locale files (extension)
- [ ] Migrations in dedicated files (api)
- [ ] Builds pass for both projects
- [ ] Tests pass for both projects

