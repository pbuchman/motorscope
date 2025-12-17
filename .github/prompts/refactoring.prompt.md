You are performing a **repository-wide refactoring pass**.

================================================================================
PREREQUISITES
================================================================================

**You MUST read these files first — they contain all coding rules:**
- `.github/copilot-instructions.md` — global rules
- `.github/instructions/api.instructions.md` — API rules
- `.github/instructions/extension.instructions.md` — extension rules
- `.github/instructions/terraform.instructions.md` — terraform rules

This prompt provides **execution strategy only**. Do not duplicate rules from above files.

================================================================================
EXECUTION STRATEGY
================================================================================

## Phase 1: Analysis (do first)

1. Run coverage: `npm run coverage`
2. Identify files with <50% coverage or 0% coverage.
3. List duplicated patterns across files.
4. Note any inconsistencies in migration export patterns.

## Phase 2: Prioritization

Refactor in this order (highest impact first):

1. **Dead code removal** — quick wins, reduces noise.
2. **Duplicated logic extraction** — consolidate before adding tests.
3. **Test coverage gaps** — focus on business logic, auth, migrations.
4. **Pattern inconsistencies** — migrations, service organization.
5. **i18n gaps** — inline strings, missing translations.

## Phase 3: Execution

For each change:
1. Make the change.
2. Run `npm run typecheck && npm run lint && npm run test`.
3. If tests fail, fix before proceeding.
4. Commit logical units separately.

## Phase 4: Verification

Final checks before completion:
```bash
npm run typecheck   # zero errors
npm run lint        # zero warnings
npm run test        # all pass
npm run coverage    # review improvements
```

For Terraform (if touched):
```bash
cd terraform && terraform fmt -check -recursive && terraform validate
```

================================================================================
DECISION RULES
================================================================================

When uncertain:

| Situation | Decision |
|-----------|----------|
| Extract utility or keep inline? | Extract if used 2+ times |
| Add test or skip? | Add if logic has branches or error paths |
| Fix now or defer? | Fix if <5 min, otherwise create TODO with justification |
| Migration pattern A or B? | Check existing migrations, match the dominant pattern |

================================================================================
OUTPUT
================================================================================

After completing refactoring, summarize:

1. **Changes made** — list of refactored areas
2. **Coverage delta** — before/after comparison
3. **Deferred items** — TODOs created with justification
4. **Risks** — anything requiring follow-up attention

