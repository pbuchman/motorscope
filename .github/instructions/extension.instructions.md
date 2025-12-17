---
applyTo: "extension/**"
---

# Extension — Path-Specific Instructions

Applies to: `/extension`

---

## Architecture

### Single Responsibility Principle (SRP)
- Each module/file has ONE clear responsibility.
- If a file does multiple unrelated things, split it.
- Naming should reflect the single purpose.

### Service Organization
- Services in `/extension/src/services/` handle external interactions.
- Each service independently testable.
- Use dependency injection where practical.

### Component Structure
- Components in `/extension/src/components/`.
- Reusable UI in `/extension/src/components/ui/`.
- Keep components **focused and minimal**.
- If a component exceeds ~150 lines, consider splitting.
- Extract repeated patterns into shared UI components.

### State Management
- Context providers in `/extension/src/context/`.
- Hooks in `/extension/src/hooks/`.
- Avoid prop drilling beyond 2 levels.

### Background Service Worker
- Entry point: `/extension/src/background.ts`.
- Message handlers must be typed.
- Alarms and scheduled jobs must be testable.

### Content Scripts
- Live in `/extension/src/content-scripts/`.
- Shared utilities in `/extension/src/content-scripts/shared/`.

---

## i18n Rules

**i18n exists ONLY in `/extension`.** Do not add translations elsewhere.

### Requirements

- No user-facing inline strings in code.
- All UI text comes from i18n.
- English is the **single source of truth**.
- Every EN key **must** exist in PL with:
  - Matching structure
  - Matching placeholders
  - Proper grammar and context

### Quality Standards

- Placeholders (`{count}`, `{name}`, ICU rules) preserved.
- Polish translations context-aware, not word-by-word.
- Fix half-translated or English leftovers immediately.

---

## Manifest V3 Rules

- Minimal permissions — no broad permissions without justification.
- Document why each permission is needed.
- Service worker must be testable.

---

## TypeScript Rules

- Zero `tsc` errors.
- `any` forbidden without inline justification.
- Prefer explicit, narrow types.
- No `@ts-ignore` or `@ts-expect-error`.

---

## Code Quality

### No Obvious Comments
- Comments explain **why**, not **what**.
- Do not add comments that restate the code.
- Delete worthless comments.

---

## Testing Requirements

### What MUST Be Tested

- Background service worker (Chrome APIs mocked)
- Message routing
- Storage interactions
- Scheduled jobs / alarms
- Non-trivial UI components
- Hooks and shared logic
- **Content scripts shared modules** (pure functions)

### Content Script Testing Strategy

Content scripts have limited testability due to DOM/Chrome API dependencies.

**Required approach:**

1. **Extract pure functions** into `content-scripts/shared/`:
   - URL utilities (normalize, validate, detect page type)
   - Phone number utilities (clean, validate)
   - DOM utilities (find buttons, debounce, observers)
   - React fiber utilities (search, extract props)
   - Logger factory

2. **Test shared modules thoroughly** (target 90%+ line coverage):
   - All branches in conditional logic
   - Edge cases: null, undefined, empty strings, malformed data

3. **Avoid window.location dependencies**:
   - Extract pure: `isListingUrl(url)` vs `isListingPage()`
   - Test the pure version

4. **Integration code** (DOM manipulation, Chrome messaging):
   - Test structure and setup
   - Skip runtime behavior requiring browser environment
   - Document untested paths

5. **MutationObserver testing**:
   - Test observer creation and configuration
   - Skip callback testing (jsdom limitations)

### Coverage Targets

- **90%+ line coverage** for shared/pure modules.
- Test all branches.
- Test edge cases.

---

## Verification Commands

Run from `/extension`:

```bash
npm run lint          # Zero warnings required
npm run typecheck     # Zero errors required
npm test              # All tests pass
npm run test:coverage # Review coverage
```

Or from repo root:

```bash
npm run lint:extension
npm run typecheck:extension
npm run test:extension
```

---

## Task Completion Checklist

**When you finish a task in `/extension`, verify:**

- [ ] `npm run typecheck` passes (from `/extension`)
- [ ] `npm run lint` passes (from `/extension`)
- [ ] `npm test` passes (from `/extension`)
- [ ] Logic changes have corresponding tests
- [ ] No `any` without documented justification
- [ ] No new ESLint or TS warnings
- [ ] i18n: no inline UI strings
- [ ] i18n: EN keys have PL equivalents
- [ ] Background/service worker changes have tests or documented manual test plan
- [ ] Content script changes: pure functions extracted and tested
- [ ] No broad permissions added without justification
- [ ] Components are minimal and focused (SRP)
- [ ] Files follow single responsibility principle

**Verification is not optional.**

