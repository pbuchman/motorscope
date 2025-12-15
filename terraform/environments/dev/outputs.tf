# =============================================================================
# Development Environment - Outputs
# =============================================================================

output "project_id" {
  description = "GCP Project ID"
  value       = module.motorscope.project_id
}

output "environment" {
  description = "Environment name"
  value       = module.motorscope.environment
}

output "firestore_database_id" {
  description = "Firestore database ID"
  value       = module.motorscope.firestore_database_id
}

output "storage_bucket_name" {
  description = "Cloud Storage bucket name"
  value       = module.motorscope.storage_bucket_name
}

output "storage_bucket_url" {
  description = "Cloud Storage bucket URL"
  value       = module.motorscope.storage_bucket_url
}

output "cloud_run_service_url" {
  description = "Cloud Run service URL"
  value       = module.motorscope.cloud_run_service_url
}

output "cloud_run_service_name" {
  description = "Cloud Run service name"
  value       = module.motorscope.cloud_run_service_name
}

output "artifact_registry_repository" {
  description = "Artifact Registry repository URL"
  value       = module.motorscope.artifact_registry_repository
}

output "service_account_email" {
  description = "Service account email for Cloud Run"
  value       = module.motorscope.service_account_email
}

output "secret_references" {
  description = "Secret Manager secret references"
  value       = module.motorscope.secret_references
}
