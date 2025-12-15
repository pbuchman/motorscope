# =============================================================================
# Root Module Outputs
# =============================================================================
# Outputs useful information about the deployed infrastructure.

output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}

output "environment" {
  description = "Deployment environment"
  value       = var.environment
}

output "firestore_database_id" {
  description = "Firestore database ID"
  value       = module.firestore.database_id
}

output "storage_bucket_name" {
  description = "Cloud Storage bucket name"
  value       = module.storage.bucket_name
}

output "storage_bucket_url" {
  description = "Cloud Storage bucket URL"
  value       = module.storage.bucket_url
}

output "cloud_run_service_url" {
  description = "Cloud Run service URL"
  value       = module.cloud_run.service_url
}

output "cloud_run_service_name" {
  description = "Cloud Run service name"
  value       = module.cloud_run.service_name
}

output "artifact_registry_repository" {
  description = "Artifact Registry repository URL"
  value       = module.artifact_registry.repository_url
}

output "service_account_email" {
  description = "Service account email for Cloud Run"
  value       = module.iam.cloud_run_service_account_email
}

# Secret references (for documentation purposes)
output "secret_references" {
  description = "Secret Manager secret references (values stored securely)"
  value = {
    jwt_secret               = module.secrets.jwt_secret_id
    oauth_client_id          = module.secrets.oauth_client_id_secret_id
    allowed_origin_extension = module.secrets.allowed_origin_extension_secret_id
    github_webhook_secret    = module.secrets.github_webhook_secret_id
  }
}

# Cloud Build trigger information
output "build_trigger_name" {
  description = "Cloud Build trigger name"
  value       = module.cloud_build.trigger_name
}

output "build_trigger_id" {
  description = "Cloud Build trigger ID"
  value       = module.cloud_build.trigger_id
}

output "build_trigger_manual_name" {
  description = "Manual Cloud Build trigger name (main branch)"
  value       = module.cloud_build.manual_trigger_name
}

output "build_trigger_manual_id" {
  description = "Manual Cloud Build trigger ID (main branch)"
  value       = module.cloud_build.manual_trigger_id
}
