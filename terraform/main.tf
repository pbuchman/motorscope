# =============================================================================
# Main Terraform Configuration
# =============================================================================
# Orchestrates all modules to create the complete MotorScope infrastructure.

# =============================================================================
# Google Cloud Provider Configuration
# =============================================================================

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# =============================================================================
# Enable Required APIs
# =============================================================================

resource "google_project_service" "required_apis" {
  for_each = toset([
    "firestore.googleapis.com",
    "storage-api.googleapis.com",
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "iam.googleapis.com",
  ])

  project = var.project_id
  service = each.value

  disable_on_destroy = false
}

# =============================================================================
# IAM Module - Service Accounts and Permissions
# =============================================================================

module "iam" {
  source = "./modules/iam"

  project_id  = var.project_id
  environment = var.environment
  labels      = var.labels

  depends_on = [google_project_service.required_apis]
}

# =============================================================================
# Secret Manager Module - Sensitive Configuration
# =============================================================================

module "secrets" {
  source = "./modules/secrets"

  project_id  = var.project_id
  environment = var.environment
  labels      = var.labels

  # Service account that needs access to secrets
  secret_accessor_email = module.iam.cloud_run_service_account_email

  depends_on = [google_project_service.required_apis, module.iam]
}

# =============================================================================
# Firestore Module - Database
# =============================================================================

module "firestore" {
  source = "./modules/firestore"

  project_id  = var.project_id
  database_id = var.firestore_database_id
  location    = var.firestore_location
  labels      = var.labels

  depends_on = [google_project_service.required_apis]
}

# =============================================================================
# Cloud Storage Module - Image Storage
# =============================================================================

module "storage" {
  source = "./modules/storage"

  project_id          = var.project_id
  bucket_name         = var.storage_bucket_name
  location            = var.region
  image_deletion_days = var.image_deletion_days
  labels              = var.labels

  # Service account that needs access to the bucket
  storage_admin_email = module.iam.cloud_run_service_account_email

  depends_on = [google_project_service.required_apis, module.iam]
}

# =============================================================================
# Artifact Registry Module - Container Images
# =============================================================================

module "artifact_registry" {
  source = "./modules/artifact-registry"

  project_id      = var.project_id
  repository_name = var.artifact_registry_repository
  location        = var.cloud_run_region
  labels          = var.labels

  depends_on = [google_project_service.required_apis]
}

# =============================================================================
# Cloud Run Module - API Service
# =============================================================================

module "cloud_run" {
  source = "./modules/cloud-run"

  project_id    = var.project_id
  service_name  = var.cloud_run_service_name
  region        = var.cloud_run_region
  memory        = var.cloud_run_memory
  cpu           = var.cloud_run_cpu
  min_instances = var.cloud_run_min_instances
  max_instances = var.cloud_run_max_instances
  labels        = var.labels

  # Service account to run as
  service_account_email = module.iam.cloud_run_service_account_email

  # Environment variables
  environment_variables = {
    NODE_ENV        = "production"
    GCP_PROJECT_ID  = var.project_id
    GCS_BUCKET_NAME = module.storage.bucket_name
  }

  # Secret references
  secrets = {
    JWT_SECRET               = module.secrets.jwt_secret_id
    OAUTH_CLIENT_ID          = module.secrets.oauth_client_id_secret_id
    ALLOWED_ORIGIN_EXTENSION = module.secrets.allowed_origin_extension_secret_id
  }

  # Container image (will be updated by CI/CD)
  container_image = "${module.artifact_registry.repository_url}/${var.cloud_run_service_name}:latest"

  depends_on = [
    google_project_service.required_apis,
    module.iam,
    module.secrets,
    module.storage,
    module.artifact_registry,
  ]
}

# =============================================================================
# Cloud Build Trigger Module - CI/CD Pipeline
# =============================================================================
# NOTE: Requires GitHub App to be connected first via console
# Go to: https://console.cloud.google.com/cloud-build/triggers/connect?project=motorscope-dev
# Connect pbuchman/motorscope repository, then run terraform apply

module "cloud_build" {
  source = "./modules/cloud-build"

  project_id                   = var.project_id
  environment                  = var.environment
  region                       = var.cloud_run_region
  branch                       = var.build_trigger_branch
  github_owner                 = var.github_owner
  github_repo                  = var.github_repo
  allowed_pusher               = var.github_allowed_pusher
  artifact_registry_repository = var.artifact_registry_repository
  service_name                 = var.cloud_run_service_name
  webhook_secret_id            = module.secrets.github_webhook_secret_id

  depends_on = [
    google_project_service.required_apis,
    module.iam,
    module.artifact_registry,
    module.cloud_run,
  ]
}

