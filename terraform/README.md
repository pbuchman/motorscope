# MotorScope Terraform Infrastructure

Infrastructure as Code (IaC) for deploying MotorScope to Google Cloud Platform.

## 📖 Documentation

**👉 For complete deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)**

## Quick Reference

- **Project ID:** `motorscope-dev`
- **Environment:** `dev`
- **Region:** `europe-west1`

## Files

| File | Purpose |
|------|---------|
| **DEPLOYMENT.md** | Complete step-by-step deployment guide |
| **SUMMARY.md** | Quick reference for commands and configuration |
| **CHECKLIST.md** | Pre-deployment and verification checklist |
| **main.tf** | Root module orchestration |
| **variables.tf** | Root module variables |
| **outputs.tf** | Root module outputs |
| **environments/dev/** | Development environment configuration |

## Directory Structure

```
terraform/
├── DEPLOYMENT.md          # 👈 Start here for deployment
├── SUMMARY.md             # Quick reference
├── CHECKLIST.md           # Deployment checklist
├── main.tf                # Root module
├── variables.tf           # Variables
├── outputs.tf             # Outputs
├── versions.tf            # Provider versions
├── environments/          # Environment-specific configs
│   └── dev/
│       ├── backend.tf
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       └── terraform.tfvars.example
└── modules/               # Reusable modules
    ├── artifact-registry/
    ├── cloud-run/
    ├── firestore/
    ├── iam/
    ├── secrets/
    └── storage/
```

## Quick Start

```bash
# 1. Navigate to environment
cd environments/dev

# 2. Configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your project details

# 3. Initialize
terraform init

# 4. Deploy
terraform apply
```

**⚠️ Important:** Follow the complete guide in **DEPLOYMENT.md** for proper setup including:
- GCP project creation
- Terraform state bucket setup
- Secret configuration
- Container image deployment
- OAuth setup

## Resources Created

| Resource | Name/ID |
|----------|---------|
| **Firestore Database** | motorscopedb |
| **Cloud Storage** | motorscope-dev-images |
| **Cloud Run** | motorscope-api |
| **Artifact Registry** | motorscope |
| **Secrets** | jwt-secret, oauth-client-id, allowed-origin-extension |

## Support

- 📖 Full setup guide: [DEPLOYMENT.md](./DEPLOYMENT.md)
- 📝 Quick commands: [SUMMARY.md](./SUMMARY.md)
- ✅ Checklist: [CHECKLIST.md](./CHECKLIST.md)

