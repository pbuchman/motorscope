# MotorScope Infrastructure as Code (Terraform)

This directory contains Terraform configuration for deploying MotorScope infrastructure to Google Cloud Platform (GCP).

## 📁 Directory Structure

```
terraform/
├── environments/           # Environment-specific configurations
│   └── dev/               # Development environment
│       ├── backend.tf     # Terraform state backend config
│       ├── main.tf        # Module instantiation
│       ├── variables.tf   # Environment-specific variables
│       ├── outputs.tf     # Environment outputs
│       └── terraform.tfvars.example  # Example variable values
├── modules/               # Reusable infrastructure modules
│   ├── artifact-registry/ # Container image repository
│   ├── cloud-run/        # Cloud Run service
│   ├── firestore/        # Firestore database
│   ├── iam/              # Service accounts and permissions
│   ├── secrets/          # Secret Manager secrets
│   └── storage/          # Cloud Storage bucket
├── main.tf               # Root module orchestration
├── variables.tf          # Root module variables
├── outputs.tf            # Root module outputs
└── versions.tf           # Provider version constraints
```

## 🚀 Prerequisites

### 1. Install Required Tools

- **Terraform**: Version 1.5.0 or higher
  ```bash
  # macOS (Homebrew)
  brew install terraform
  
  # Linux (apt)
  sudo apt-get update && sudo apt-get install -y gnupg software-properties-common
  wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg
  echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
  sudo apt update && sudo apt install terraform
  ```

- **Google Cloud CLI**: [Install gcloud](https://cloud.google.com/sdk/docs/install)
  ```bash
  # macOS (Homebrew)
  brew install google-cloud-sdk
  
  # Linux
  curl https://sdk.cloud.google.com | bash
  ```

### 2. GCP Project Setup

1. Create a GCP project (or use existing):
   ```bash
   gcloud projects create motorscope --name="MotorScope"
   gcloud config set project motorscope
   ```

2. Enable billing on the project

3. Authenticate with GCP:
   ```bash
   gcloud auth login
   gcloud auth application-default login
   ```

### 3. Create Terraform State Bucket

Before running Terraform, create a GCS bucket for storing Terraform state:

```bash
# Create state bucket
gsutil mb -p motorscope -l europe-west1 gs://motorscope-terraform-state

# Enable versioning for state protection
gsutil versioning set on gs://motorscope-terraform-state
```

## 📋 Deployment Guide (Step by Step)

### Step 1: Clone Repository and Navigate to Environment

```bash
git clone https://github.com/pbuchman/motorscope.git
cd motorscope/terraform/environments/dev
```

### Step 2: Create Variable File

Copy the example variables file and customize:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
project_id          = "motorscope"           # Your GCP project ID
storage_bucket_name = "motorscope-dev-images" # Must be globally unique
```

### Step 3: Initialize Terraform

```bash
terraform init
```

This will:
- Download required providers
- Initialize the GCS backend for state storage
- Download module dependencies

### Step 4: Review Planned Changes

```bash
terraform plan
```

Review the output carefully. This shows all resources that will be created.

### Step 5: Apply Configuration

```bash
terraform apply
```

Type `yes` when prompted to confirm.

### Step 6: Set Secret Values

After Terraform creates the Secret Manager secrets, you must add the actual secret values:

```bash
# Set JWT Secret (generate a secure random value)
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets versions add jwt-secret --data-file=-

# Set OAuth Client ID (from GCP Console → APIs & Services → Credentials)
echo -n "YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com" | \
  gcloud secrets versions add oauth-client-id --data-file=-

# Set Chrome Extension Origin (format: chrome-extension://EXTENSION_ID)
echo -n "chrome-extension://YOUR_EXTENSION_ID" | \
  gcloud secrets versions add allowed-origin-extension --data-file=-
```

### Step 7: Initial Container Image Push

Before Cloud Run can deploy, push an initial container image:

```bash
# Navigate to API directory
cd ../../../api

# Build and push container image
gcloud builds submit --tag europe-west1-docker.pkg.dev/motorscope/motorscope/motorscope-dev:latest
```

### Step 8: Verify Deployment

```bash
# Get the Cloud Run URL
terraform output cloud_run_service_url

# Test health endpoint
curl $(terraform output -raw cloud_run_service_url)/api/healthz
```

## 🔐 Secret Management

### Secret References

The following secrets are managed by Secret Manager:

| Secret ID | Description | How to Set |
|-----------|-------------|------------|
| `jwt-secret` | JWT signing key for authentication | Generate with `openssl rand -base64 32` |
| `oauth-client-id` | Google OAuth 2.0 client ID | Get from GCP Console |
| `allowed-origin-extension` | Chrome extension origin for CORS | Format: `chrome-extension://EXTENSION_ID` |

### Updating Secrets

```bash
# Update a secret value
echo -n "NEW_VALUE" | gcloud secrets versions add SECRET_ID --data-file=-

# View secret versions
gcloud secrets versions list SECRET_ID

# Access a specific version
gcloud secrets versions access VERSION_NUMBER --secret=SECRET_ID
```

### Security Best Practices

1. **Never commit secrets to version control**
2. **Rotate secrets regularly** (especially JWT secret)
3. **Use least-privilege access** - service accounts only get necessary permissions
4. **Enable audit logging** for secret access monitoring

## 🏗️ Architecture Overview

### Resources Created

| Resource | Description |
|----------|-------------|
| **Firestore Database** | Native mode database for user data, listings, and settings |
| **Cloud Storage Bucket** | Stores listing images with lifecycle management |
| **Cloud Run Service** | Runs the MotorScope API container |
| **Artifact Registry** | Stores Docker container images |
| **Secret Manager Secrets** | Securely stores sensitive configuration |
| **Service Account** | Identity for Cloud Run with necessary permissions |
| **IAM Bindings** | Permissions for service accounts |

### IAM Permissions

The Cloud Run service account is granted:
- `roles/datastore.user` - Firestore read/write access
- `roles/storage.objectAdmin` - Cloud Storage access
- `roles/secretmanager.secretAccessor` - Secret access
- `roles/logging.logWriter` - Logging access

## 🔄 CI/CD Integration

### Cloud Build Trigger

The existing `cloudbuild.yaml` can be updated to work with Terraform-managed infrastructure:

1. The artifact registry and service name are now managed by Terraform
2. Update Cloud Build trigger with the correct repository URL
3. Secrets are referenced from Secret Manager

### Updating cloudbuild.yaml

The Cloud Build configuration should reference Terraform outputs:

```yaml
substitutions:
  _REGION: 'europe-west1'
  _REPOSITORY: 'motorscope'
  _SERVICE_NAME: 'motorscope-dev'
```

## 🔍 Troubleshooting

### Common Issues

**1. "Error creating Database: googleapi: Error 409"**
- Firestore database already exists
- Import existing resource: `terraform import module.motorscope.module.firestore.google_firestore_database.main projects/PROJECT_ID/databases/DATABASE_ID`

**2. "Error creating Secret: already exists"**
- Secret already exists in Secret Manager
- Import: `terraform import module.motorscope.module.secrets.google_secret_manager_secret.jwt_secret projects/PROJECT_ID/secrets/jwt-secret`

**3. "Permission denied on resource"**
- Ensure you're authenticated: `gcloud auth application-default login`
- Verify project ID is correct
- Check IAM permissions

**4. "Backend configuration changed"**
- Run `terraform init -reconfigure`

### Viewing Logs

```bash
# Cloud Run logs
gcloud run services logs read motorscope-dev --region=europe-west1

# Cloud Build logs
gcloud builds log BUILD_ID
```

## 📊 Outputs Reference

After deployment, these outputs are available:

| Output | Description |
|--------|-------------|
| `project_id` | GCP project ID |
| `environment` | Deployment environment (dev/prod) |
| `firestore_database_id` | Firestore database identifier |
| `storage_bucket_name` | Cloud Storage bucket name |
| `storage_bucket_url` | Full URL to storage bucket |
| `cloud_run_service_url` | Public URL of the API |
| `cloud_run_service_name` | Cloud Run service name |
| `artifact_registry_repository` | Container image repository URL |
| `service_account_email` | Cloud Run service account |
| `secret_references` | Secret Manager secret IDs |

View outputs:
```bash
terraform output
terraform output -raw cloud_run_service_url
```

## 🗑️ Destroying Infrastructure

To destroy all infrastructure (⚠️ IRREVERSIBLE):

```bash
terraform destroy
```

**Warning**: This will delete all resources including:
- Firestore database and all data
- Cloud Storage bucket and all images
- Cloud Run service
- All secrets

## 📚 Additional Resources

- [Terraform Google Provider Documentation](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Google Cloud Firestore Documentation](https://cloud.google.com/firestore/docs)
- [Google Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
