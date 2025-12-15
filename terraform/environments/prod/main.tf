# =============================================================================
# Production Environment Configuration
# =============================================================================

module "motorscope" {
  source = "../.."

  # Project Configuration
  project_id  = var.project_id
  environment = var.environment
  region      = var.region

  # Cloud Run Configuration
  cloud_run_region        = var.cloud_run_region
  cloud_run_service_name  = var.cloud_run_service_name
  cloud_run_min_instances = var.cloud_run_min_instances
  cloud_run_max_instances = var.cloud_run_max_instances

  # Storage Configuration
  storage_bucket_name = var.storage_bucket_name

  # Firestore Configuration
  firestore_database_id = var.firestore_database_id

  # Artifact Registry Configuration
  artifact_registry_repository = var.artifact_registry_repository

  # GitHub Configuration (for manual trigger only)
  github_owner          = var.github_owner
  github_repo           = var.github_repo
  github_allowed_pusher = var.github_allowed_pusher
  build_trigger_branch  = var.build_trigger_branch
}

