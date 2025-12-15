# =============================================================================
# Development Environment - Main Configuration
# =============================================================================
# Instantiates the root module with development-specific values.

module "motorscope" {
  source = "../.."

  # GCP Project Configuration
  project_id  = var.project_id
  environment = "dev"

  # Region Configuration
  region = "europe-west1"

  # Firestore Configuration
  firestore_database_id = "motorscopedb"
  firestore_location    = "europe-west1"

  # Cloud Storage Configuration
  storage_bucket_name = var.storage_bucket_name

  # Cloud Run Configuration
  cloud_run_service_name = "motorscope-dev"
  cloud_run_region       = "europe-west1"
  cloud_run_memory       = "512Mi"
  cloud_run_cpu          = "1"
  cloud_run_min_instances = 0
  cloud_run_max_instances = 10

  # Artifact Registry Configuration
  artifact_registry_repository = "motorscope"

  # Image lifecycle
  image_deletion_days = 30

  # Labels
  labels = {
    environment = "development"
    project     = "motorscope"
    managed-by  = "terraform"
  }
}
