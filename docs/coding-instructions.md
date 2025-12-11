# Coding Instructions

Guidelines for making code changes in the MotorScope project.

For comprehensive refactoring tasks, see [refactoring-prompt.md](./refactoring-prompt.md).

---

## General Principles

1. **Zero TypeScript errors, zero warnings**: The build must complete with no errors and no warnings (including "shorten import" hints, unused variables, etc.).
2. **No suppression hacks**: Do not use `ts-ignore`, `ts-expect-error`, or loosen types to `any`/`unknown` just to hide errors.
3. **Always validate changes**: After editing a file, check for TypeScript errors and fix them.
4. **Build and test**: Run `npm run build` and `npm test` for both projects.

---

## TypeScript / Module Style

### ESM Only

- Use `import` / `export` syntax only
- Do not introduce `require()` or `module.exports`

### Import Paths

- Use the `@/` path alias instead of deep relative paths
- Example: Use `@/types` instead of `../../types`
- The alias is configured in `tsconfig.json` as `"@/*": ["./src/*"]`

### Typing

- Do not introduce `any` unless absolutely unavoidable
- Prefer explicit, accurate types
- Fix implicit `any` warnings

### Anti-Patterns to Avoid

1. **Throwing exceptions caught locally**
   ```typescript
   // ❌ Bad
   try {
     if (!data) throw new Error('No data');
   } catch (error) {
     throw new Error('Operation failed');
   }
   
   // ✅ Good
   if (!data) throw new Error('No data');
   try {
     // external operations only
   } catch (error) {
     throw new Error('Operation failed');
   }
   ```

2. **Redundant local variables**
   ```typescript
   // ❌ Bad
   const result = fn();
   return result;
   
   // ✅ Good
   return fn();
   ```

3. **Unused variables/imports** - Remove them; use `_` prefix for intentionally unused params

4. **Deeply nested promise chains** - Use `async/await`

5. **Copy-pasted code** - Factor into shared utilities

---

## Code Formatting

Consistent formatting is **enforced at the monorepo level** by ESLint and EditorConfig.

### EditorConfig (WebStorm / VS Code)

The root `.editorconfig` file enforces formatting in all editors that support it (WebStorm, VS Code, etc.):
- 4-space indentation for TypeScript/JavaScript
- UTF-8 encoding
- LF line endings
- Trim trailing whitespace
- Insert final newline

**WebStorm**: EditorConfig is supported natively. Settings are automatically applied.

### ESLint Configuration (Monorepo)

The root `/.eslintrc.json` defines shared rules for both `/api` and `/extension`:
- 4-space indentation
- Single quotes for strings/imports
- No spaces inside braces `{foo}` not `{ foo }`
- Trailing commas in multiline
- No trailing whitespace
- Newline at end of file

Each project extends the root config:
- `/api/.eslintrc.json` - extends root, adds Node.js env
- `/extension/.eslintrc.json` - extends root, adds browser env + JSX

### Running Checks

```bash
# Monorepo-wide commands (from root)
npm run lint          # Lint both projects
npm run lint:fix      # Auto-fix both projects
npm run typecheck     # Type-check both projects
npm run build         # Build both (includes lint + typecheck)
npm run test          # Test both projects

# Per-project commands
npm run lint:api      # Lint API only
npm run lint:extension # Lint extension only
npm run typecheck:api # Type-check API only
npm run typecheck:extension # Type-check extension only
```

**Note**: `npm run build` runs `lint → typecheck → compile` for each project. Build fails on any error.

### Indentation & Spacing

- **Indentation**: 4 spaces (no tabs) - **enforced by ESLint**
- **Line length**: Keep lines reasonably short (~100-120 chars)
- **Trailing whitespace**: None
- **Final newline**: Files should end with a single newline

### Import Formatting

- **No spaces inside braces**: `{foo, bar}` not `{ foo, bar }`
- **Single quotes** for import paths: `'./types'` not `"./types"`
- **Group imports** by type (React, external, internal) with blank lines between

```typescript
// ✅ Correct
import React, {useCallback, useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';

import {CarListing} from '@/types';
import {useAuth} from '@/auth/AuthContext';
```

### Object/Array Formatting

- **No spaces inside braces/brackets** for inline: `{foo: 1}` not `{ foo: 1 }`
- **Trailing commas** in multi-line objects/arrays
- **Consistent brace style**: Opening brace on same line

```typescript
// ✅ Correct
const config = {
    id: 'test',
    enabled: true,
};

// ✅ Correct inline
const obj = {foo: 1, bar: 2};
```

### Function Formatting

- **Arrow functions** preferred for callbacks and functional components
- **No space before parentheses** in function calls: `fn()` not `fn ()`
- **Space after keywords**: `if (`, `for (`, `while (`

```typescript
// ✅ Correct
const handleClick = () => {
    doSomething();
};

if (condition) {
    // ...
}
```

---

## i18n (Extension Only)

- All user-facing strings must use i18n (`t()`, `useTranslation()`)
- English is canonical; Polish must be synced (all EN keys must exist in PL)
- No inline user-visible text in components
- Preserve placeholders (`{{name}}`, etc.) in translations
- Use appropriate plural forms (`_plural`, `_0` for Polish zero-form)

---

## Export Patterns

### Migrations (API)

Use default exports with a `Migration` object:

```typescript
import type { Migration } from './types.js';

const migration: Migration = {
  id: 'YYYYMMDD_description',
  description: 'Human readable description',
  up: async (db) => { /* logic */ },
};

export default migration;
```

Registry (`/api/src/migrations/index.ts`):
```typescript
import myMigration from './YYYYMMDD_description.js';
export const migrations: Migration[] = [myMigration];
```

### Components and Services (Extension)

- Use named exports for most modules
- Use default exports only for top-level page components

---

## Testing Principles

Tests must be **behavior-focused**:

- ❌ Avoid "renders without crashing" as the only assertion
- ❌ Avoid pure snapshot tests that don't guard behavior
- ✅ For each test: "If I break this logic, will this test fail?"
- ✅ Assert on user-visible outcomes and data changes

---

## Project Structure

### Extension (`/extension`)

- Background service worker: `src/background.ts`
- Auth: `chrome.identity.getAuthToken()` for Google OAuth
- Session storage: `chrome.storage.session` for runtime state
- i18n: EN/PL locales in `src/i18n/locales/`

### API (`/api`)

- Express + Firestore
- JWT tokens include `jti` for blacklist support
- Migrations: one file per migration in `src/migrations/`
- No i18n - English only

---

## Before Committing

```bash
# Both must pass with no errors/warnings
# Note: npm run build automatically runs lint first
cd api && npm run build && npm test
cd extension && npm run build && npm test

# To auto-fix formatting issues:
cd api && npm run lint:fix
cd extension && npm run lint:fix
```

### Checklist

- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors (build will fail otherwise)
- [ ] No `ts-ignore` or `any` hacks (in production code)
- [ ] Import paths use `@/` alias where applicable
- [ ] No unused variables or imports
- [ ] 4-space indentation, single quotes, no trailing whitespace
- [ ] i18n: EN/PL keys in sync (extension)
- [ ] Tests pass for both projects

