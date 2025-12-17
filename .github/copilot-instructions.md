# MotorScope — Global Copilot Instructions

These rules apply to **all code changes** in this repository.
Domain-specific rules are in `.github/instructions/*.instructions.md`.

---

## Repository Structure

```
/extension    — Chrome extension (TypeScript, React, i18n EN/PL)
/api          — Backend API (TypeScript, Express, Firestore)
/terraform    — Infrastructure as Code (GCP)
/scripts      — Shell automation
/docs         — Technical documentation
```

---

## Non-Negotiable Global Rules

### 1. TypeScript Correctness

- Zero `tsc` errors in `/api` and `/extension`.
- Forbidden: `@ts-ignore`, `@ts-expect-error`, unsafe casts, loosening to `any`/`unknown`.
- `any` allowed only with inline justification.

### 2. Zero Warnings

- No TypeScript warnings.
- No ESLint warnings.
- No test runner warnings.
- No unused imports, variables, deprecated APIs.

**If tooling reports it, you fix it.**

### 3. ESM Only

- Use `import` / `export`.
- No `require()`, no `module.exports`.

### 4. No Dead Code

- Remove unused code immediately.
- No TODO without ticket reference or clear justification.

### 5. No Magic Strings

- Extract constants or use configuration.
- No copy-pasted logic — create shared utilities.

### 6. No Obvious Comments

- Do not add comments that restate what code does.
- Comments explain **why**, not **what**.
- Delete worthless comments: `// increment counter`, `// return the value`.

### 7. External Contracts

Do not change casually:
- HTTP response shapes
- Message formats
- Migration entry points

If unavoidable: explicit, minimal, documented.

---

## Testing Philosophy (Global)

Goal: **maximum reasonable coverage**, not artificial 100%.

### Forbidden Tests

- "renders without crashing"
- Snapshot-only tests
- Tests asserting only mock calls
- Tests that pass after breaking real logic

### Required Properties

- Assert **observable behavior**.
- Fail on **realistic regressions**.
- Mock external systems (Chrome APIs, Firestore, network), not the system under test.

---

## Verification Commands

Run from repo root:

| Check | Command |
|-------|---------|
| Typecheck all | `npm run typecheck` |
| Lint all | `npm run lint` |
| Test all | `npm run test` |
| Build all | `npm run build` |
| Coverage | `npm run coverage` |

---

## Task Completion Checklist

**When you finish ANY task, you MUST:**

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] No new warnings introduced
- [ ] Changes to logic have corresponding tests
- [ ] Domain-specific checklist completed (see path-specific instructions)

**Do not claim "done" until verified.**

---

## Honesty Rules

- Do not claim work is complete unless it actually is.
- Do not bluff about coverage or correctness.
- If ambiguous: make a reasonable decision and document it.

---

## Instruction Maintenance

**When a new rule is established during a session:**

If user enforces a new rule (e.g., "always run `npm install` after changing `package.json`"), immediately add it to the appropriate instruction file:

- Global rules → `.github/copilot-instructions.md`
- API-specific → `.github/instructions/api.instructions.md`
- Extension-specific → `.github/instructions/extension.instructions.md`
- Terraform-specific → `.github/instructions/terraform.instructions.md`

This ensures rules persist across sessions and are enforced consistently.

---

## Path-Specific Instructions

Detailed rules for each domain are in:
- `.github/instructions/api.instructions.md` — Backend API
- `.github/instructions/extension.instructions.md` — Chrome Extension
- `.github/instructions/terraform.instructions.md` — Infrastructure

These are loaded automatically based on the file path you're working in.

