# Production Environment Setup Guide

## Overview

This guide walks you through deploying the **production** environment for MotorScope.

**Environment:** Production (`prod`)  
**GCP Project ID:** `motorscope-prod`  
**Region:** `europe-west1`  
**Branch:** `main`  
**Deployment:** Manual trigger only (no automatic deployments)

---

## Prerequisites

- ✅ Terraform CLI installed (1.5.0+)
- ✅ Google Cloud CLI installed
- ✅ Billing account with sufficient quota
- ✅ GitHub repository connected to Cloud Build (2nd gen)

---

## Step 1: Create GCP Project

### 1.1 Create Project

```bash
# Create production project
gcloud projects create motorscope-prod \
  --name="MotorScope Production" \
  --set-as-default

# Verify
gcloud config get-value project
# Should output: motorscope-prod
```

### 1.2 Link Billing Account

```bash
# List billing accounts
gcloud billing accounts list

# Link to production project (replace BILLING_ACCOUNT_ID)
gcloud billing projects link motorscope-prod \
  --billing-account=BILLING_ACCOUNT_ID
```

### 1.3 Authenticate

```bash
# User authentication
gcloud auth login

# Application Default Credentials
gcloud auth application-default login

# Set project
gcloud config set project motorscope-prod
```

---

## Step 2: Create Terraform State Storage

```bash
# Create GCS bucket for Terraform state
gsutil mb -p motorscope-prod -l europe-west1 gs://motorscope-prod-terraform-state

# Enable versioning
gsutil versioning set on gs://motorscope-prod-terraform-state

# Verify
gsutil ls -L -b gs://motorscope-prod-terraform-state
```

---

## Step 3: Configure Environment

```bash
cd terraform/environments/prod

# Create terraform.tfvars from example
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` if needed (defaults are already set for production):

```hcl
project_id  = "motorscope-prod"
environment = "prod"

cloud_run_min_instances = 1   # Keep 1 instance always running
cloud_run_max_instances = 10  # Allow scaling

storage_bucket_name = "motorscope-prod-images"  # Must be globally unique

github_owner          = "pbuchman"
github_repo           = "motorscope"
build_trigger_branch  = "main"
```

---

## Step 4: Initialize Terraform

```bash
terraform init
```

Expected output:
- Backend configured with `motorscope-prod-terraform-state`
- Providers downloaded
- Modules initialized

---

## Step 5: Review Plan

```bash
terraform plan
```

Review the resources to be created:
- ~25 resources
- **Note:** No webhook trigger (manual only for production)

**Key Differences from Dev:**
- ✅ Project ID: `motorscope-prod`
- ✅ Service account: `motorscope-api-prod@motorscope-prod.iam.gserviceaccount.com`
- ✅ Bucket: `motorscope-prod-images`
- ✅ **No automatic webhook trigger** (manual deployments only)
- ✅ Manual trigger uses `main` branch
- ✅ Minimum 1 instance always running (better performance)

---

## Step 6: Deploy Infrastructure

```bash
terraform apply
```

Type `yes` when prompted.

This creates:
- Firestore database
- Cloud Storage bucket
- Cloud Run service
- Artifact Registry
- IAM service accounts and permissions
- Secret Manager secrets (empty)
- **Manual Cloud Build trigger only** (no webhook)

---

## Step 7: Configure Secrets

### 7.1 JWT Secret

```bash
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets versions add jwt-secret \
  --project=motorscope-prod \
  --data-file=-
```

### 7.2 OAuth Client ID

Create OAuth credentials:

1. Go to: https://console.cloud.google.com/apis/credentials?project=motorscope-prod
2. Create OAuth client ID (Type: **Chrome Extension**)
3. Copy the Client ID

```bash
echo -n "YOUR_PROD_CLIENT_ID.apps.googleusercontent.com" | \
  gcloud secrets versions add oauth-client-id \
  --project=motorscope-prod \
  --data-file=-
```

### 7.3 Chrome Extension Origin

```bash
echo -n "chrome-extension://YOUR_EXTENSION_ID" | \
  gcloud secrets versions add allowed-origin-extension \
  --project=motorscope-prod \
  --data-file=-
```

### 7.4 Verify Secrets

```bash
gcloud secrets list --project=motorscope-prod
```

---

## Step 8: Link GitHub Repository (2nd Gen)

**⚠️ Important:** You must link the GitHub repository to this project for the manual trigger to work.

1. Go to: https://console.cloud.google.com/cloud-build/repositories?project=motorscope-prod

2. Click **"Connect Repository"** → **"Cloud Build repositories"** (2nd gen)

3. Authenticate with GitHub

4. Select **`pbuchman/motorscope`** repository

5. Click **"Connect"**

6. Verify:
   ```bash
   # Should show: pbuchman-motorscope
   gcloud builds repositories list \
     --connection=projects/motorscope-prod/locations/europe-west1/connections/github \
     --region=europe-west1 \
     --project=motorscope-prod
   ```

---

## Step 9: Build and Deploy Initial Image

### 9.1 Build Container

```bash
cd ~/personal/motorscope/api

gcloud builds submit \
  --project=motorscope-prod \
  --tag=europe-west1-docker.pkg.dev/motorscope-prod/motorscope/motorscope-api:latest
```

### 9.2 Deploy to Cloud Run

```bash
gcloud run services update motorscope-api \
  --project=motorscope-prod \
  --region=europe-west1 \
  --image=europe-west1-docker.pkg.dev/motorscope-prod/motorscope/motorscope-api:latest
```

---

## Step 10: Verify Deployment

### 10.1 Get Service URL

```bash
cd ~/personal/motorscope/terraform/environments/prod
terraform output cloud_run_service_url
```

### 10.2 Test Health Endpoint

```bash
SERVICE_URL=$(terraform output -raw cloud_run_service_url)
curl $SERVICE_URL/api/healthz
```

Expected:
```json
{
  "status": "ok",
  "timestamp": "...",
  "environment": "production"
}
```

---

## Step 11: Manual Deployments (Production)

### ⚠️ Production Deployment Philosophy

**Production uses MANUAL deployments only:**
- ✅ No automatic builds on push
- ✅ Manual trigger execution required
- ✅ Deploy from `main` branch only
- ✅ Controlled, verified releases

### 11.1 Via Cloud Console

1. Go to: https://console.cloud.google.com/cloud-build/triggers?project=motorscope-prod
2. Find **"motorscope-api-deploy-prod-manual"**
3. Click **"RUN"**
4. Confirm branch: `main`
5. Click **"RUN TRIGGER"**

### 11.2 Via gcloud CLI

```bash
# Run manual trigger
gcloud builds triggers run motorscope-api-deploy-prod-manual \
  --project=motorscope-prod \
  --region=europe-west1 \
  --branch=main
```

### 11.3 Monitor Build

```bash
# Watch builds
gcloud builds list --project=motorscope-prod --ongoing

# View logs
gcloud builds log BUILD_ID --project=motorscope-prod
```

---

## Step 12: Production Deployment Workflow

### Recommended Process

1. **Test in Dev Environment**
   ```bash
   # Push to development branch
   git checkout development
   git push origin development
   # Automatic deployment to motorscope-dev
   ```

2. **Merge to Main**
   ```bash
   # Create PR: development → main
   # Review and merge via GitHub
   git checkout main
   git pull origin main
   ```

3. **Manual Deploy to Production**
   ```bash
   # Run production trigger manually
   gcloud builds triggers run motorscope-api-deploy-prod-manual \
     --project=motorscope-prod \
     --region=europe-west1 \
     --branch=main
   ```

4. **Verify Production**
   ```bash
   # Test production API
   PROD_URL=$(cd terraform/environments/prod && terraform output -raw cloud_run_service_url)
   curl $PROD_URL/api/healthz
   ```

---

## Outputs Reference

```bash
terraform output
```

| Output | Description |
|--------|-------------|
| `cloud_run_service_url` | Production API URL |
| `service_account_email` | Service account email |
| `storage_bucket_name` | Image storage bucket |
| `build_trigger_manual_name` | Manual trigger name |
| `build_trigger_name` | `null` (no webhook in prod) |

---

## Key Differences: Dev vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| **Project ID** | motorscope-dev | motorscope-prod |
| **Branch** | development | main |
| **Webhook Trigger** | ✅ Yes (auto-deploy) | ❌ No |
| **Manual Trigger** | ✅ Yes | ✅ Yes (only option) |
| **Min Instances** | 0 | 1 (always running) |
| **Max Instances** | 5 | 10 |
| **Deployment** | Automatic on push | Manual only |
| **Purpose** | Fast iteration | Controlled releases |

---

## Troubleshooting

### Error: "Backend initialization required"

```bash
terraform init -reconfigure
```

### Error: "Permission denied"

```bash
gcloud auth application-default login
gcloud config set project motorscope-prod
```

### Error: "Bucket already exists"

Change `storage_bucket_name` in `terraform.tfvars` to a globally unique name.

### Manual Trigger Not Found

Verify GitHub repository is connected:
```bash
gcloud builds repositories list --project=motorscope-prod
```

If not, follow Step 8 to connect the repository.

---

## Security Considerations

### Production Security Checklist

- ✅ Separate OAuth credentials for production
- ✅ Different secrets (JWT, etc.) from dev
- ✅ Manual deployments only (no automatic)
- ✅ Minimum 1 instance running (better security posture)
- ✅ Same IAM permissions as dev (principle of least privilege)
- ✅ Firestore database separate from dev
- ✅ Cloud Storage bucket separate from dev

### Recommended Additional Security

1. **Enable Cloud Armor** (DDoS protection)
2. **Set up Cloud Monitoring alerts**
3. **Configure uptime checks**
4. **Enable audit logging**
5. **Set up budget alerts**

---

## Maintenance

### Update Secrets

```bash
# JWT secret
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets versions add jwt-secret \
  --project=motorscope-prod \
  --data-file=-
```

### Deploy Updates

```bash
# Always deploy manually in production
gcloud builds triggers run motorscope-api-deploy-prod-manual \
  --project=motorscope-prod \
  --region=europe-west1 \
  --branch=main
```

### Update Infrastructure

```bash
cd terraform/environments/prod
terraform plan   # Review changes
terraform apply  # Apply after review
```

---

## Cleanup

**⚠️ WARNING:** This destroys all production data!

```bash
cd terraform/environments/prod
terraform destroy
```

Delete state bucket:
```bash
gsutil rm -r gs://motorscope-prod-terraform-state
```

---

## Next Steps

After successful production deployment:

1. ✅ Configure production Chrome extension with prod API URL
2. ✅ Set up monitoring and alerting
3. ✅ Configure custom domain (optional)
4. ✅ Set up Cloud CDN (optional)
5. ✅ Enable Cloud Armor (recommended)
6. ✅ Configure backup strategy

---

## Support

- 📖 Main deployment guide: [terraform/DEPLOYMENT.md](../../DEPLOYMENT.md)
- 🔧 Production config: `terraform/environments/prod/`
- 💻 GCP Console: https://console.cloud.google.com/home/dashboard?project=motorscope-prod

