# Production Environment Setup - Quick Reference

## Overview

Complete production environment for MotorScope with **manual deployments only**.

---

## Prerequisites

✅ GCP account with billing  
✅ Terraform CLI (1.5.0+)  
✅ Google Cloud CLI  

---

## Step-by-Step Setup

### 1. Create GCP Project

```bash
gcloud projects create motorscope-prod --name="MotorScope Production"
gcloud billing projects link motorscope-prod --billing-account=BILLING_ACCOUNT_ID
gcloud auth application-default login
```

### 2. Create Terraform State Bucket

```bash
gsutil mb -p motorscope-prod -l europe-west1 gs://motorscope-prod-terraform-state
gsutil versioning set on gs://motorscope-prod-terraform-state
```

### 3. Initialize and Deploy

```bash
cd terraform/environments/prod
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform apply
```

### 4. Configure Secrets

```bash
# JWT Secret
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets versions add jwt-secret --project=motorscope-prod --data-file=-

# OAuth Client ID (create at console.cloud.google.com/apis/credentials)
echo -n "YOUR_PROD_CLIENT_ID.apps.googleusercontent.com" | \
  gcloud secrets versions add oauth-client-id --project=motorscope-prod --data-file=-

# Extension Origin
echo -n "chrome-extension://YOUR_EXTENSION_ID" | \
  gcloud secrets versions add allowed-origin-extension --project=motorscope-prod --data-file=-
```

### 5. Link GitHub Repository (2nd Gen)

1. Go to: https://console.cloud.google.com/cloud-build/repositories?project=motorscope-prod
2. Connect **pbuchman/motorscope** repository
3. Verify:
   ```bash
   gcloud builds repositories list --project=motorscope-prod
   ```

### 6. Build Initial Image

```bash
cd ~/personal/motorscope/api
gcloud builds submit --project=motorscope-prod \
  --tag=europe-west1-docker.pkg.dev/motorscope-prod/motorscope/motorscope-api:latest
```

### 7. Deploy to Production (Manual)

```bash
gcloud builds triggers run motorscope-api-deploy-prod-manual \
  --project=motorscope-prod \
  --region=europe-west1 \
  --branch=main
```

### 8. Verify

```bash
cd terraform/environments/prod
SERVICE_URL=$(terraform output -raw cloud_run_service_url)
curl $SERVICE_URL/api/healthz
```

---

## Production Deployment Workflow

```bash
# 1. Test in dev
git checkout development
git push origin development
# ✅ Auto-deploys to motorscope-dev

# 2. Merge to main
git checkout main
git pull origin main
# (after PR review and merge)

# 3. Deploy to prod (manual)
gcloud builds triggers run motorscope-api-deploy-prod-manual \
  --project=motorscope-prod \
  --region=europe-west1 \
  --branch=main
```

---

## Key Differences: Dev vs Prod

| Feature | Dev | Prod |
|---------|-----|------|
| Project | motorscope-dev | motorscope-prod |
| Branch | development | main |
| Auto-deploy | ✅ Yes | ❌ No |
| Manual trigger | ✅ Yes | ✅ Yes (only) |
| Min instances | 0 | 1 |

---

## Complete Documentation

📖 **Full Setup Guide:** `terraform/environments/prod/SETUP.md`

This includes:
- Detailed explanations
- Security considerations
- Troubleshooting
- Maintenance tasks
- Complete workflow examples

---

## Support

- Production console: https://console.cloud.google.com/home/dashboard?project=motorscope-prod
- Build triggers: https://console.cloud.google.com/cloud-build/triggers?project=motorscope-prod
- Cloud Run: https://console.cloud.google.com/run?project=motorscope-prod

