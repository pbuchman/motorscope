# Copilot Instructions — Developer Guide

This document explains how GitHub Copilot instructions are structured in this repository and how to extend them.

---

## Structure Overview

```
.github/
├── copilot-instructions.md           # Global (repo-wide) rules
└── instructions/
    ├── api.instructions.md           # API-specific rules (api/**)
    ├── extension.instructions.md     # Extension-specific rules (extension/**)
    └── terraform.instructions.md     # Terraform-specific rules (terraform/**)
```

---

## How It Works

### Automatic Loading

GitHub Copilot loads instructions based on the file you're working in:

| Working in | Instructions loaded |
|------------|---------------------|
| `api/src/routes.ts` | Global + `api.instructions.md` |
| `extension/src/App.tsx` | Global + `extension.instructions.md` |
| `terraform/main.tf` | Global + `terraform.instructions.md` |
| `README.md` | Global only |

### Path-Specific Frontmatter

Each path-specific file uses frontmatter to define scope:

```yaml
---
applyTo: "api/**"
---
```

The glob pattern determines when the file is loaded.

---

## Extending Instructions

### Adding Domain-Specific Rules

1. Edit the appropriate `.github/instructions/*.instructions.md` file.
2. Keep rules **verifiable** — provide commands, not vague guidance.
3. Update the task completion checklist if adding new requirements.

### Adding a New Domain

If you add a new top-level directory (e.g., `/mobile`):

1. Create `.github/instructions/mobile.instructions.md`
2. Add frontmatter: `applyTo: "mobile/**"`
3. Follow the structure of existing instruction files
4. Update CI workflow if needed

### Modifying Global Rules

Edit `.github/copilot-instructions.md` only for rules that apply everywhere:
- TypeScript/ESM standards
- Testing philosophy
- Global verification commands

**Do not duplicate domain-specific content in the global file.**

---

## CI Enforcement

The CI workflow (`.github/workflows/ci.yml`) enforces quality gates:

| Domain | Checks |
|--------|--------|
| API | lint, typecheck, test, build |
| Extension | lint, typecheck, test, build |
| Terraform | fmt -check, validate (root, dev, prod) |

**PRs cannot merge if any check fails.**

---

## Verification Commands

### From Repo Root

```bash
# All domains
npm run typecheck
npm run lint
npm run test
npm run build

# Specific domain
npm run typecheck:api
npm run lint:extension
npm run test:api
```

### Terraform

```bash
cd terraform
terraform fmt -check -recursive
terraform validate

cd environments/dev
terraform init -backend=false
terraform validate
```

---

## Task Completion Checklist

Every task must complete these checks:

### Global (Always)
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes

### API Tasks
- [ ] Logic changes have tests
- [ ] Auth/validation changes have tests
- [ ] No `any` without justification

### Extension Tasks
- [ ] Logic changes have tests
- [ ] i18n: no inline strings, EN/PL parity
- [ ] Content script pure functions tested

### Terraform Tasks
- [ ] `terraform fmt -check -recursive` passes
- [ ] `terraform validate` passes
- [ ] No hard-coded secrets/regions

---

## Troubleshooting

### Instructions Not Loading

1. Verify file is in `.github/instructions/`
2. Check frontmatter `applyTo` glob pattern
3. Ensure file has `.instructions.md` extension

### CI Failing

1. Run the failing command locally
2. Fix the issue
3. Push updated code

### Copilot Ignoring Rules

1. Rules are guidance, not enforcement
2. CI provides the actual enforcement
3. Report persistent issues to the team

---

## Maintenance

Review and update instructions when:
- Adding new verification steps
- Changing project structure
- Updating testing requirements
- Adding new domains/directories

Keep instructions:
- **Concise** — no redundancy
- **Verifiable** — with specific commands
- **Current** — reflect actual project state

---

## Documentation Rules

Documentation follows minimal duplication principles:

| Document | Single Purpose |
|----------|----------------|
| Root `README.md` | Complete project overview (functional + technical) |
| `terraform/DEPLOYMENT.md` | Infrastructure deployment (single source of truth) |
| `extension/docs/` | Extension architecture details |
| `docs/` | Backend flows and technical decisions |

**Rules:**
- Each document has ONE clear purpose
- Do not duplicate content across files
- Reference other documents instead of copying
- Delete outdated documentation
- Merge overlapping documents

