---
applyTo: "api/**"
---

# API — Path-Specific Instructions

Applies to: `/api`

---

## Architecture

### Route Organization
- Routes in `/api/src/routes.ts` (or split by domain if large).
- Proper error handling on every route.
- Consistent response format.

### Authentication
- Auth logic centralized in `/api/src/auth.ts`.
- Token validation is centralized.
- Never expose sensitive data in responses.

### Database Access
- Firestore access centralized in `/api/src/db.ts`.
- Use typed document references.
- Batch operations where appropriate.

### Migrations
- All migrations in `/api/src/migrations/`.
- One migration = one file.
- Orchestrator imports, orders, executes — no inline logic.

Migration requirements:
- Idempotent
- Batch-safe
- Logged
- Tested

### API Documentation
- Swagger definitions in `/api/src/swagger.ts`.
- Keep OpenAPI spec in sync with endpoints.
- **Every route change requires corresponding Swagger update.**
- Document request/response schemas, error codes, auth requirements.

---

## Code Quality

### No Obvious Comments
- Comments explain **why**, not **what**.
- Do not add comments that restate the code.
- Delete worthless comments.

---

## TypeScript Rules

- Zero `tsc` errors.
- `any` forbidden without inline justification.
- Prefer explicit, narrow types.
- No `@ts-ignore` or `@ts-expect-error`.

---

## Testing Requirements

### What MUST Be Tested

- Core business logic
- Data transformations
- Auth flows
- HTTP endpoints (routes)
- **All migrations**
- Utility functions

### Coverage Targets

- **90%+ line coverage** for pure functions and utilities.
- Test all branches in conditional logic.
- Test edge cases: null, undefined, empty strings, malformed data.

### Test Quality

- Tests must fail on realistic regressions.
- Mock Firestore properly (emulator or structured mocks).
- Mock network calls.
- Do not mock away the system under test.

---

## Verification Commands

Run from `/api`:

```bash
npm run lint          # Zero warnings required
npm run typecheck     # Zero errors required
npm test              # All tests pass
npm run test:coverage # Review coverage
```

Or from repo root:

```bash
npm run lint:api
npm run typecheck:api
npm run test:api
```

---

## Task Completion Checklist

**When you finish a task in `/api`, verify:**

- [ ] `npm run typecheck` passes (from `/api`)
- [ ] `npm run lint` passes (from `/api`)
- [ ] `npm test` passes (from `/api`)
- [ ] Logic changes have corresponding tests
- [ ] No `any` without documented justification
- [ ] No new ESLint or TS warnings
- [ ] Auth/validation changes have tests
- [ ] Migration changes are idempotent and tested
- [ ] API contract changes are documented
- [ ] Route changes have Swagger documentation updated

**Verification is not optional.**

