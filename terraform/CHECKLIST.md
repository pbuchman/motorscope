# Pre-Deployment Checklist for motorscope-dev

Use this checklist before deploying infrastructure to ensure all prerequisites are met.

---

## ☑️ Prerequisites

### Tools Installation
- [ ] Terraform installed (version 1.5.0+)
  ```bash
  terraform --version
  ```
- [ ] Google Cloud CLI installed
  ```bash
  gcloud --version
  ```
- [ ] OpenSSL available (for secret generation)
  ```bash
  openssl version
  ```

### GCP Account Setup
- [ ] GCP account created
- [ ] Billing account linked
- [ ] Authenticated with gcloud
  ```bash
  gcloud auth login
  gcloud auth application-default login
  ```
- [ ] Project set correctly
  ```bash
  gcloud config get-value project  # Should be: motorscope-dev
  ```

---

## ☑️ Pre-Deployment Steps

### 1. Project Setup
- [ ] GCP project `motorscope-dev` created
  ```bash
  gcloud projects create motorscope-dev --name="MotorScope Dev"
  ```
- [ ] Billing linked to project
  ```bash
  gcloud billing projects describe motorscope-dev
  ```
- [ ] Project set as default
  ```bash
  gcloud config set project motorscope-dev
  ```

### 2. Terraform State Storage
- [ ] State bucket created: `motorscope-dev-terraform-state`
  ```bash
  gsutil mb -p motorscope-dev -l europe-west1 gs://motorscope-dev-terraform-state
  ```
- [ ] Versioning enabled on state bucket
  ```bash
  gsutil versioning set on gs://motorscope-dev-terraform-state
  ```
- [ ] Bucket exists and accessible
  ```bash
  gsutil ls gs://motorscope-dev-terraform-state
  ```

### 3. Configuration Files
- [ ] Navigated to correct directory
  ```bash
  cd terraform/environments/dev
  ```
- [ ] Created `terraform.tfvars` from example
  ```bash
  cp terraform.tfvars.example terraform.tfvars
  ```
- [ ] Updated `terraform.tfvars` with correct values:
  - [ ] `project_id = "motorscope-dev"`
  - [ ] `storage_bucket_name = "motorscope-dev-images"` (or other unique name)

### 4. OAuth Client Configuration
- [ ] OAuth 2.0 Client created in GCP Console (APIs & Services → Credentials)
- [ ] Application type set to **"Chrome Extension"**
- [ ] Extension ID added (Item ID field)
- [ ] Client ID copied and saved securely

---

## ☑️ Deployment Steps

### 1. Initialize Terraform
- [ ] Initialize Terraform
  ```bash
  terraform init
  ```
- [ ] Verify successful initialization (no errors)

### 2. Review Plan
- [ ] Generate Terraform plan
  ```bash
  terraform plan
  ```
- [ ] Review resources to be created (~20-25 resources)
- [ ] Verify project ID is `motorscope-dev` in plan output
- [ ] Verify bucket names include `-dev` suffix

### 3. Apply Infrastructure
- [ ] Apply Terraform configuration
  ```bash
  terraform apply
  ```
- [ ] Type `yes` to confirm
- [ ] Wait for completion (3-5 minutes)
- [ ] Verify all resources created successfully

### 4. Configure Secrets
- [ ] Generate and set JWT secret
  ```bash
  echo -n "$(openssl rand -base64 32)" | \
    gcloud secrets versions add jwt-secret --project=motorscope-dev --data-file=-
  ```
- [ ] Set OAuth Client ID
  ```bash
  echo -n "YOUR_CLIENT_ID.apps.googleusercontent.com" | \
    gcloud secrets versions add oauth-client-id --project=motorscope-dev --data-file=-
  ```
- [ ] Set Extension Origin (use placeholder if extension not ready)
  ```bash
  echo -n "chrome-extension://YOUR_EXTENSION_ID" | \
    gcloud secrets versions add allowed-origin-extension --project=motorscope-dev --data-file=-
  ```
- [ ] Verify all secrets have versions
  ```bash
  gcloud secrets list --project=motorscope-dev
  gcloud secrets versions list jwt-secret --project=motorscope-dev
  gcloud secrets versions list oauth-client-id --project=motorscope-dev
  gcloud secrets versions list allowed-origin-extension --project=motorscope-dev
  ```

### 5. Build and Deploy API
- [ ] Navigate to API directory
  ```bash
  cd ../../../api
  ```
- [ ] Build and push container image
  ```bash
  gcloud builds submit \
    --project=motorscope-dev \
    --tag=europe-west1-docker.pkg.dev/motorscope-dev/motorscope/motorscope-api:latest
  ```
- [ ] Wait for build completion (2-3 minutes)
- [ ] Verify image in Artifact Registry
  ```bash
  gcloud artifacts docker images list \
    europe-west1-docker.pkg.dev/motorscope-dev/motorscope \
    --project=motorscope-dev
  ```

### 6. Verify OAuth Configuration
- [ ] Verify OAuth client type is "Chrome Extension" in GCP Console
- [ ] Verify Extension ID matches the one in chrome://extensions
- [ ] Verify Client ID is set in the `oauth-client-id` secret
  ```bash
  gcloud secrets versions access latest --secret=oauth-client-id --project=motorscope-dev
  ```

---

## ☑️ Post-Deployment Verification

### 1. Service Health
- [ ] Get service URL
  ```bash
  SERVICE_URL=$(terraform output -raw cloud_run_service_url)
  echo $SERVICE_URL
  ```
- [ ] Test health endpoint
  ```bash
  curl $SERVICE_URL/api/healthz
  ```
- [ ] Verify response contains `"status": "ok"`

### 2. Review Logs
- [ ] Check Cloud Run logs
  ```bash
  gcloud run services logs read motorscope-api \
    --project=motorscope-dev \
    --region=europe-west1 \
    --limit=20
  ```
- [ ] Verify no errors in logs

### 3. Verify Resources
- [ ] Check Firestore database exists
  ```bash
  gcloud firestore databases describe motorscopedb --project=motorscope-dev
  ```
- [ ] Check storage bucket exists
  ```bash
  gsutil ls -L -b gs://motorscope-dev-images
  ```
- [ ] Check service account exists
  ```bash
  gcloud iam service-accounts describe \
    motorscope-api@motorscope-dev.iam.gserviceaccount.com \
    --project=motorscope-dev
  ```

### 4. Review Outputs
- [ ] View all Terraform outputs
  ```bash
  terraform output
  ```
- [ ] Verify all expected outputs are present:
  - [ ] `cloud_run_service_url`
  - [ ] `storage_bucket_name`
  - [ ] `service_account_email`
  - [ ] `artifact_registry_repository`
  - [ ] `secret_references`

---

## ☑️ Documentation

- [ ] Cloud Run URL documented
- [ ] Service account email saved
- [ ] OAuth Client ID saved securely
- [ ] Extension ID noted (for later update if using placeholder)

---

## ☑️ Next Steps

- [ ] Test API authentication flow
- [ ] Configure Chrome extension with Cloud Run URL
- [ ] Update extension ID in allowed origin secret (if placeholder was used)
- [ ] Set up Cloud Build trigger for CI/CD
- [ ] Configure monitoring and alerting
- [ ] Test end-to-end functionality

---

## 🚨 Troubleshooting

If any step fails, refer to:
- `DEPLOYMENT.md` - Full deployment guide with troubleshooting section
- `SUMMARY.md` - Quick reference for commands and configuration
- `README.md` - General documentation

Common issues:
- **Permission denied**: Re-authenticate with `gcloud auth application-default login`
- **Bucket already exists**: Change `storage_bucket_name` in `terraform.tfvars`
- **Service not starting**: Check secrets are set correctly
- **Backend error**: Verify state bucket exists and is accessible

---

## ✅ Completion

Once all items are checked:
- Infrastructure is deployed
- Services are running
- API is accessible
- Ready for integration testing

**Deployment completed on:** _________________

**Deployed by:** _________________

**Notes:** 
_________________________________________________________________________________
_________________________________________________________________________________
_________________________________________________________________________________

