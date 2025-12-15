# Terraform Configuration Summary

## Project Configuration

**GCP Project ID:** `motorscope-dev`  
**Environment:** `dev`  
**Region:** `europe-west1`

---

## Key Resources

| Resource | Name/ID | Location |
|----------|---------|----------|
| **Project** | motorscope-dev | - |
| **Terraform State Bucket** | motorscope-dev-terraform-state | europe-west1 |
| **Image Storage Bucket** | motorscope-dev-images | europe-west1 |
| **Firestore Database** | motorscopedb | europe-west1 |
| **Cloud Run Service** | motorscope-api | europe-west1 |
| **Artifact Registry** | motorscope | europe-west1 |

---

## Changes Made

### 1. Project ID Updates
- Changed from `motorscope` to `motorscope-dev`
- Updated in all relevant configuration files

### 2. Environment Naming
- Changed from `development` to `dev`
- Updated validation rules in `variables.tf`
- Updated environment value in `environments/dev/main.tf`
- Updated labels to use `environment = "dev"`

### 3. Bucket Names
- **Terraform State:** `motorscope-dev-terraform-state`
- **Images:** `motorscope-dev-images`

---

## Configuration Files

### `/terraform/variables.tf`
- Environment validation: `["dev", "prod"]`

### `/terraform/environments/dev/backend.tf`
- Backend bucket: `motorscope-dev-terraform-state`

### `/terraform/environments/dev/main.tf`
- Environment: `dev`
- Labels: `environment = "dev"`

### `/terraform/environments/dev/terraform.tfvars.example`
- Project ID: `motorscope-dev`
- Storage bucket: `motorscope-dev-images`

---

## Quick Start Commands

### Create Infrastructure

```bash
# Navigate to dev environment
cd terraform/environments/dev

# Create terraform.tfvars
cp terraform.tfvars.example terraform.tfvars

# Initialize Terraform
terraform init

# Review plan
terraform plan

# Apply changes
terraform apply
```

### Set Secrets

```bash
# JWT Secret
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets versions add jwt-secret \
  --project=motorscope-dev \
  --data-file=-

# OAuth Client ID
echo -n "YOUR_CLIENT_ID.apps.googleusercontent.com" | \
  gcloud secrets versions add oauth-client-id \
  --project=motorscope-dev \
  --data-file=-

# Extension Origin
echo -n "chrome-extension://YOUR_EXTENSION_ID" | \
  gcloud secrets versions add allowed-origin-extension \
  --project=motorscope-dev \
  --data-file=-
```

### Deploy API Container

```bash
cd api

gcloud builds submit \
  --project=motorscope-dev \
  --tag=europe-west1-docker.pkg.dev/motorscope-dev/motorscope/motorscope-api:latest
```

---

## Documentation

- **Full Deployment Guide:** `DEPLOYMENT.md`
- **General README:** `README.md`
- **Environment Config:** `environments/dev/`

---

## Environment Variables Set by Terraform

The Cloud Run service receives these environment variables:

```bash
NODE_ENV=production
GCP_PROJECT_ID=motorscope-dev
GCS_BUCKET_NAME=motorscope-dev-images
```

Plus secrets from Secret Manager:
- `JWT_SECRET`
- `OAUTH_CLIENT_ID`
- `ALLOWED_ORIGIN_EXTENSION`

---

## Service Account

**Email:** `motorscope-api@motorscope-dev.iam.gserviceaccount.com`

**Roles:**
- `roles/datastore.user`
- `roles/storage.objectAdmin`
- `roles/secretmanager.secretAccessor`
- `roles/logging.logWriter`

---

## Outputs

After deployment, retrieve information:

```bash
terraform output                          # All outputs
terraform output cloud_run_service_url    # API URL
terraform output service_account_email    # Service account
terraform output storage_bucket_name      # Bucket name
```

---

## Validation

### Check Terraform Configuration

```bash
cd terraform/environments/dev
terraform fmt -recursive  # Format files
terraform validate        # Validate syntax
```

### Check GCP Resources

```bash
# List enabled APIs
gcloud services list --enabled --project=motorscope-dev

# Check Firestore
gcloud firestore databases describe motorscopedb --project=motorscope-dev

# Check Cloud Run
gcloud run services describe motorscope-api \
  --project=motorscope-dev \
  --region=europe-west1

# Check Storage Bucket
gsutil ls -L -b gs://motorscope-dev-images
```

---

## Migration from Old Configuration

If you had old infrastructure with project `motorscope`:

### Option 1: Import Existing Resources
```bash
# Import Firestore database
terraform import 'module.motorscope.module.firestore.google_firestore_database.main' \
  'projects/motorscope-dev/databases/motorscopedb'

# Import secrets
terraform import 'module.motorscope.module.secrets.google_secret_manager_secret.jwt_secret' \
  'projects/motorscope-dev/secrets/jwt-secret'
```

### Option 2: Fresh Deployment
1. Destroy old infrastructure (if safe)
2. Deploy new infrastructure with updated project ID
3. Migrate data if needed

---

## Next Steps After Deployment

1. ✅ Verify all services are running
2. ✅ Test API endpoints
3. ✅ Configure Chrome extension with new Cloud Run URL
4. ✅ Set up monitoring and alerts
5. ✅ Configure Cloud Build triggers for CI/CD
6. ✅ Document OAuth client configuration
7. ✅ Test end-to-end authentication flow

---

## Support

For detailed setup instructions, see `DEPLOYMENT.md`.

