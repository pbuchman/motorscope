# Complete Deployment Guide for MotorScope Infrastructure

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites Checklist](#prerequisites-checklist)
3. [Step 1: Install Required Tools](#step-1-install-required-tools)
4. [Step 2: Create and Configure GCP Project](#step-2-create-and-configure-gcp-project)
5. [Step 3: Create Terraform State Storage](#step-3-create-terraform-state-storage)
6. [Step 4: Configure Environment Variables](#step-4-configure-environment-variables)
7. [Step 5: Initialize Terraform](#step-5-initialize-terraform)
8. [Step 6: Review Infrastructure Plan](#step-6-review-infrastructure-plan)
9. [Step 7: Deploy Infrastructure](#step-7-deploy-infrastructure)
10. [Step 8: Configure Secrets](#step-8-configure-secrets)
11. [Step 9: Build and Deploy API Container](#step-9-build-and-deploy-api-container)
12. [Step 10: Verify Deployment](#step-10-verify-deployment)
13. [Step 11: Configure CI/CD with Cloud Build](#step-11-configure-cicd-with-cloud-build)
    - [11.1: Link GitHub Repository (2nd Gen)](#111-link-github-repository-2nd-gen)
    - [11.2: Create Cloud Build Trigger](#112-create-cloud-build-trigger)
    - [11.3: Create GitHub Webhook Secret](#113-create-github-webhook-secret)
    - [11.4: Configure GitHub Webhook](#114-configure-github-webhook)
    - [11.5: Import Trigger to Terraform](#115-import-trigger-to-terraform)
    - [11.6: Test CI/CD Pipeline](#116-test-cicd-pipeline)
    - [11.7: Troubleshooting CI/CD](#117-troubleshooting-cicd)
14. [Outputs Reference](#outputs-reference)
15. [Maintenance Tasks](#maintenance-tasks)
16. [Troubleshooting](#troubleshooting)
17. [Cleanup / Destruction](#cleanup--destruction)
18. [Next Steps](#next-steps)

---

## Overview

This guide provides step-by-step instructions for deploying MotorScope infrastructure to GCP project `motorscope-dev`.

**Target Environment:** Development (`dev`)  
**GCP Project ID:** `motorscope-dev`  
**Region:** `europe-west1`

---

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] GCP account with billing enabled
- [ ] Terraform CLI installed (version 1.5.0+)
- [ ] Google Cloud CLI (`gcloud`) installed
- [ ] Access to create projects in your GCP organization (or an existing project)
- [ ] Owner or Editor role on the target GCP project

---

## Step 1: Install Required Tools

### Terraform

**macOS:**
```bash
brew install terraform
terraform --version  # Should be 1.5.0+
```

**Linux:**
```bash
wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform
```

### Google Cloud CLI

**macOS:**
```bash
brew install google-cloud-sdk
```

**Linux:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

Verify installation:
```bash
gcloud --version
```

---

## Step 2: Create and Configure GCP Project

### 2.1 Create Project

```bash
# Create the project
gcloud projects create motorscope-dev \
  --name="MotorScope Dev" \
  --set-as-default

# Verify project creation
gcloud config get-value project
# Should output: motorscope-dev
```

### 2.2 Link Billing Account

```bash
# List available billing accounts
gcloud billing accounts list

# Link billing to project (replace BILLING_ACCOUNT_ID)
gcloud billing projects link motorscope-dev \
  --billing-account=BILLING_ACCOUNT_ID
```

### 2.3 Authenticate

```bash
# User authentication
gcloud auth login

# Application Default Credentials (required by Terraform)
gcloud auth application-default login

# Verify current configuration
gcloud config list
```

---

## Step 3: Create Terraform State Storage

Terraform state must be stored remotely for collaboration and safety.

```bash
# Create GCS bucket for Terraform state
gsutil mb -p motorscope-dev -l europe-west1 gs://motorscope-dev-terraform-state

# Enable versioning (protects against accidental deletions)
gsutil versioning set on gs://motorscope-dev-terraform-state

# Verify bucket
gsutil ls -L -b gs://motorscope-dev-terraform-state
```

**Important:** This bucket stores Terraform state. Never delete it manually.

---

## Step 4: Configure Environment Variables

Navigate to the dev environment directory:

```bash
cd terraform/environments/dev
```

Create `terraform.tfvars` from the example:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

```hcl
project_id          = "motorscope-dev"
storage_bucket_name = "motorscope-dev-images"
```

**Note:** `storage_bucket_name` must be globally unique across all GCP projects.

---

## Step 5: Initialize Terraform

```bash
terraform init
```

Expected output:
- Backend successfully configured
- Provider plugins downloaded
- Modules initialized

If you see errors about backend configuration, verify:
- The state bucket exists: `gsutil ls gs://motorscope-dev-terraform-state`
- You have permissions: `gcloud auth list`

---

## Step 6: Review Infrastructure Plan

```bash
terraform plan
```

Review the output carefully. Terraform will show:
- **Resources to create:** ~20-25 resources
- **Services to enable:** Firestore, Cloud Run, Secret Manager, etc.
- **IAM bindings:** Service account permissions

**Key resources:**
- Firestore database: `motorscopedb`
- Cloud Storage bucket: `motorscope-dev-images`
- Cloud Run service: `motorscope-api`
- Artifact Registry: `motorscope`
- Service account: `motorscope-api@motorscope-dev.iam.gserviceaccount.com`
- 3 Secret Manager secrets

---

## Step 7: Deploy Infrastructure

```bash
terraform apply
```

Type `yes` when prompted.

Deployment takes approximately 3-5 minutes.

**What happens:**
1. Enables required GCP APIs
2. Creates service accounts
3. Creates Firestore database
4. Creates Cloud Storage bucket
5. Creates Secret Manager secrets (empty)
6. Creates Artifact Registry repository
7. Creates Cloud Run service (initial deployment will fail until secrets are set)

---

## Step 8: Configure Secrets

After deployment, set secret values in Secret Manager.

### 8.1 JWT Secret

Generate and store a secure random value:

```bash
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets versions add jwt-secret \
  --project=motorscope-dev \
  --data-file=-
```

### 8.2 OAuth Client ID

First, create OAuth 2.0 credentials:

1. Go to: https://console.cloud.google.com/apis/credentials?project=motorscope-dev
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Chrome Extension**
4. Name: `MotorScope Extension`
5. Item ID: Your Chrome extension ID (get from chrome://extensions)
6. Click **Create**
7. Copy the Client ID

Store the OAuth Client ID:

```bash
# Replace YOUR_CLIENT_ID with the actual value
echo -n "YOUR_CLIENT_ID.apps.googleusercontent.com" | \
  gcloud secrets versions add oauth-client-id \
  --project=motorscope-dev \
  --data-file=-
```

**Important:** The Client ID must match the one configured in the Chrome extension's `manifest.json` file. Chrome extensions use `chrome.identity.getAuthToken()` which requires the OAuth client type to be "Chrome Extension", not "Web application".

### 8.3 Chrome Extension Origin

You'll need your Chrome extension ID. If you don't have it yet, use a placeholder:

```bash
# Replace YOUR_EXTENSION_ID with actual Chrome extension ID
echo -n "chrome-extension://YOUR_EXTENSION_ID" | \
  gcloud secrets versions add allowed-origin-extension \
  --project=motorscope-dev \
  --data-file=-
```

**To get your extension ID:**
1. Load extension in Chrome
2. Go to `chrome://extensions`
3. Enable Developer mode
4. Copy the ID from your extension card

### 8.4 Verify Secrets

```bash
# List all secrets
gcloud secrets list --project=motorscope-dev

# Verify each secret has a version
gcloud secrets versions list jwt-secret --project=motorscope-dev
gcloud secrets versions list oauth-client-id --project=motorscope-dev
gcloud secrets versions list allowed-origin-extension --project=motorscope-dev
```

---

## Step 9: Build and Deploy API Container

### 9.1 Build Container Image

From the repository root:

```bash
cd api

gcloud builds submit \
  --project=motorscope-dev \
  --tag=europe-west1-docker.pkg.dev/motorscope-dev/motorscope/motorscope-api:latest
```

This will:
- Build the Docker image using `api/Dockerfile`
- Push to Artifact Registry
- Take 2-3 minutes

### 9.2 Deploy to Cloud Run

After the image is pushed, Cloud Run will automatically deploy it (or trigger a new revision):

```bash
# Force a new Cloud Run deployment
gcloud run services update motorscope-api \
  --project=motorscope-dev \
  --region=europe-west1 \
  --image=europe-west1-docker.pkg.dev/motorscope-dev/motorscope/motorscope-api:latest
```

---

## Step 10: Verify Deployment

### 10.1 Get Service URL

```bash
cd ../../terraform/environments/dev
terraform output cloud_run_service_url
```

Or:

```bash
gcloud run services describe motorscope-api \
  --project=motorscope-dev \
  --region=europe-west1 \
  --format='value(status.url)'
```

### 10.2 Test Health Endpoint

```bash
SERVICE_URL=$(terraform output -raw cloud_run_service_url)
curl $SERVICE_URL/api/healthz
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-15T10:30:00.000Z",
  "environment": "production"
}
```

### 10.3 Check Logs

```bash
gcloud run services logs read motorscope-api \
  --project=motorscope-dev \
  --region=europe-west1 \
  --limit=50
```

---

## Step 11: Configure CI/CD with Cloud Build

### 11.1 Link GitHub Repository (2nd Gen)

Cloud Build uses 2nd generation repositories for better GitHub integration.

1. **Open Cloud Build Repositories:**
   ```
   https://console.cloud.google.com/cloud-build/repositories?project=motorscope-dev
   ```

2. **Connect Repository:**
   - Click **"Connect Repository"** or **"Create Host Connection"**
   - Select **"Cloud Build repositories"** (2nd gen)
   - Click **"Continue"**

3. **Authenticate with GitHub:**
   - Click **"Authenticate"**
   - Sign in to GitHub
   - Authorize **"Google Cloud Build"** app

4. **Select Repository:**
   - Select your GitHub account/organization
   - Choose **`pbuchman/motorscope`** repository
   - Click **"Connect"**

5. **Verify Connection:**
   ```bash
   gcloud builds repositories list \
     --connection=projects/motorscope-dev/locations/europe-west1/connections/github \
     --region=europe-west1 \
     --project=motorscope-dev
   ```

   You should see: `pbuchman-motorscope`

### 11.2 Create Cloud Build Trigger

The trigger is managed by Terraform but must be imported first.

1. **Create Trigger in Console:**
   
   Go to: https://console.cloud.google.com/cloud-build/triggers?project=motorscope-dev

   - Click **"Create Trigger"**
   - **Name:** `motorscope-api-deploy-dev`
   - **Region:** `europe-west1 (Belgium)`
   - **Event:** Select **"Webhook event"**
   - **Webhook URL:** (will be shown after creation)
   - **Secret:** Select `github-webhook-secret` (create if doesn't exist)

2. **Configure Source:**
   - **Repository:** Select **"2nd gen"**
   - **Repository:** `pbuchman-motorscope`
   - **Branch:** `development` (exact branch name, not regex)

3. **Configure Build:**
   - **Type:** Cloud Build configuration file (YAML or JSON)
   - **Location:** Repository
   - **Cloud Build configuration file location:** `/api/cloudbuild.yaml`

4. **Advanced Settings:**
   - **Service account:** `motorscope-api-dev@motorscope-dev.iam.gserviceaccount.com`
   - **Substitution variables:** (optional, can be added later)
     - `_PUSHER_NAME`: `$(body.pusher.name)`
   - **Filter:** `_PUSHER_NAME.matches("^pbuchman$")` (only trigger for specific user)

5. **Click "Create"**

6. **Note the Trigger ID** from the URL:
   ```
   https://console.cloud.google.com/cloud-build/triggers/edit/TRIGGER_ID?project=motorscope-dev
   ```

### 11.3 Create GitHub Webhook Secret

If not already created:

```bash
# Generate a random secret
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo "Webhook Secret: $WEBHOOK_SECRET"
# Save this value - you'll need it for GitHub

# Store in Secret Manager
echo -n "$WEBHOOK_SECRET" | \
  gcloud secrets create github-webhook-secret \
    --project=motorscope-dev \
    --replication-policy="automatic" \
    --data-file=-
```

Or add a new version if secret exists:
```bash
echo -n "$WEBHOOK_SECRET" | \
  gcloud secrets versions add github-webhook-secret \
    --project=motorscope-dev \
    --data-file=-
```

### 11.4 Configure GitHub Webhook

1. **Get Webhook URL from Cloud Build:**
   
   After creating the trigger, click **"Show URL preview"** in the trigger details, or construct it:
   ```
   https://cloudbuild.googleapis.com/v1/projects/motorscope-dev/locations/europe-west1/triggers/TRIGGER_ID:webhook
   ```
   
   Replace `TRIGGER_ID` with your actual trigger ID.

2. **Add Webhook to GitHub Repository:**
   
   Go to: https://github.com/pbuchman/motorscope/settings/hooks

   - Click **"Add webhook"**
   
   **Webhook Configuration:**
   - **Payload URL:** 
     ```
     https://cloudbuild.googleapis.com/v1/projects/motorscope-dev/locations/europe-west1/triggers/TRIGGER_ID:webhook
     ```
   - **Content type:** `application/json`
   - **Secret:** The webhook secret you generated in step 11.3
   - **SSL verification:** ✅ Enable SSL verification
   - **Which events would you like to trigger this webhook?**
     - Select **"Just the push event"**
   - **Active:** ✅ Checked

3. **Click "Add webhook"**

4. **Verify Webhook:**
   - GitHub will send a ping event
   - Check the "Recent Deliveries" tab
   - Should show a green checkmark ✅

### 11.5 Import Trigger to Terraform

Once the trigger is created manually, import it into Terraform:

```bash
cd terraform/environments/dev

# Get trigger ID from Cloud Console URL or:
TRIGGER_ID=$(gcloud builds triggers list \
  --project=motorscope-dev \
  --region=europe-west1 \
  --filter="name=motorscope-api-deploy-dev" \
  --format="value(id)")

# Import to Terraform
terraform import -lock=false \
  module.motorscope.module.cloud_build.google_cloudbuild_trigger.api_deploy \
  projects/motorscope-dev/locations/europe-west1/triggers/$TRIGGER_ID
```

Verify no changes needed:
```bash
terraform plan -lock=false
```

Should output: `No changes. Your infrastructure matches the configuration.`

### 11.6 Test CI/CD Pipeline

Test the complete pipeline:

```bash
cd ~/personal/motorscope
git checkout development
echo "# CI/CD Test" >> api/README.md
git add api/README.md
git commit -m "Test Cloud Build trigger"
git push origin development
```

**Monitor the build:**

```bash
# List recent builds
gcloud builds list --project=motorscope-dev --limit=5

# Watch specific build
gcloud builds log BUILD_ID --project=motorscope-dev --stream
```

**Expected behavior:**
1. GitHub sends webhook to Cloud Build
2. Trigger checks filter: pusher is "pbuchman"?
3. Executes `/api/cloudbuild.yaml`
4. Builds Docker image
5. Pushes to Artifact Registry
6. Deploys to Cloud Run
7. New revision is live

**Verify deployment:**
```bash
# Get latest Cloud Run revision
gcloud run revisions list \
  --service=motorscope-api \
  --project=motorscope-dev \
  --region=europe-west1 \
  --limit=1

# Test API
SERVICE_URL=$(gcloud run services describe motorscope-api \
  --project=motorscope-dev \
  --region=europe-west1 \
  --format='value(status.url)')

curl $SERVICE_URL/api/healthz
```

### 11.7 Troubleshooting CI/CD

**Webhook not triggering:**
- Check GitHub webhook deliveries: https://github.com/pbuchman/motorscope/settings/hooks
- Verify webhook secret matches Secret Manager
- Check trigger is enabled in Cloud Console

**Build fails at permission error:**
- Verify service account has `artifactregistry.writer` role:
  ```bash
  gcloud projects get-iam-policy motorscope-dev \
    --filter="bindings.members:motorscope-api-dev" \
    --format="table(bindings.role)"
  ```

**Build executes but Cloud Run doesn't update:**
- Check Cloud Build logs for deployment step
- Verify image was pushed to Artifact Registry:
  ```bash
  gcloud artifacts docker images list \
    europe-west1-docker.pkg.dev/motorscope-dev/motorscope \
    --project=motorscope-dev
  ```

---

## Outputs Reference

After deployment, view all outputs:

```bash
terraform output
```

Key outputs:

| Output | Description |
|--------|-------------|
| `cloud_run_service_url` | API base URL |
| `storage_bucket_name` | Image storage bucket |
| `service_account_email` | Cloud Run service account |
| `artifact_registry_repository` | Container registry URL |
| `secret_references` | Secret Manager secret IDs |

---

## Maintenance Tasks

### Updating Secrets

```bash
# Update JWT secret
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets versions add jwt-secret \
  --project=motorscope-dev \
  --data-file=-

# Update OAuth client ID
echo -n "NEW_CLIENT_ID.apps.googleusercontent.com" | \
  gcloud secrets versions add oauth-client-id \
  --project=motorscope-dev \
  --data-file=-
```

### Deploying Code Changes

```bash
cd api
gcloud builds submit \
  --project=motorscope-dev \
  --tag=europe-west1-docker.pkg.dev/motorscope-dev/motorscope/motorscope-api:latest
```

### Updating Infrastructure

```bash
cd terraform/environments/dev
terraform plan   # Review changes
terraform apply  # Apply changes
```

### Viewing Logs

```bash
# Cloud Run logs
gcloud run services logs read motorscope-api \
  --project=motorscope-dev \
  --region=europe-west1 \
  --limit=100

# Cloud Build logs
gcloud builds list --project=motorscope-dev
gcloud builds log BUILD_ID --project=motorscope-dev
```

---

## Troubleshooting

### Error: "Backend initialization required"

```bash
terraform init -reconfigure
```

### Error: "Permission denied"

Check authentication:
```bash
gcloud auth list
gcloud config get-value project
```

Re-authenticate if needed:
```bash
gcloud auth application-default login
```

### Error: "Bucket already exists"

Someone else is using that bucket name. Change `storage_bucket_name` in `terraform.tfvars` to something unique.

### Error: "Firestore database already exists"

Import the existing database:
```bash
terraform import 'module.motorscope.module.firestore.google_firestore_database.main' \
  'projects/motorscope-dev/databases/motorscopedb'
```

### Cloud Run Service Not Starting

Check logs:
```bash
gcloud run services logs read motorscope-api \
  --project=motorscope-dev \
  --region=europe-west1
```

Common issues:
- Missing or invalid secrets
- Container image not found
- Insufficient permissions

Verify secrets:
```bash
gcloud secrets versions list jwt-secret --project=motorscope-dev
gcloud secrets versions list oauth-client-id --project=motorscope-dev
gcloud secrets versions list allowed-origin-extension --project=motorscope-dev
```

### API Returns 500 Errors

Check environment variables in Cloud Run:
```bash
gcloud run services describe motorscope-api \
  --project=motorscope-dev \
  --region=europe-west1 \
  --format=yaml
```

Verify Firestore is accessible:
```bash
gcloud firestore databases describe motorscopedb \
  --project=motorscope-dev
```

---

## Cleanup / Destruction

**⚠️ WARNING:** This is irreversible and will delete all data.

```bash
cd terraform/environments/dev
terraform destroy
```

This will delete:
- All Firestore data
- All images in Cloud Storage
- All secrets
- Cloud Run service
- Service accounts
- Artifact Registry images

The Terraform state bucket must be deleted manually:
```bash
gsutil rm -r gs://motorscope-dev-terraform-state
```

---

## Next Steps

After successful deployment:

1. **Configure Chrome Extension:**
   - Update extension config with Cloud Run URL
   - Add extension ID to allowed origin secret

2. **Set up CI/CD:**
   - Create Cloud Build trigger
   - Connect to GitHub repository
   - Automate deployments on push

3. **Enable Monitoring:**
   - Set up Cloud Monitoring alerts
   - Configure error reporting
   - Set up uptime checks

4. **Production Environment:**
   - Create `terraform/environments/prod`
   - Use project `motorscope-prod`
   - Increase resource limits
   - Enable high availability

---

## Support

For issues or questions:
- Check logs: `gcloud run services logs read motorscope-api --project=motorscope-dev`
- Review Terraform plan: `terraform plan`
- Verify GCP console: https://console.cloud.google.com/home/dashboard?project=motorscope-dev

