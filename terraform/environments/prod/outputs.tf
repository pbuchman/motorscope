# =============================================================================
# Production Environment Outputs
# =============================================================================

output "project_id" {
  description = "GCP project ID"
  value       = module.motorscope.project_id
}

output "environment" {
  description = "Environment name"
  value       = module.motorscope.environment
}

output "cloud_run_service_url" {
  description = "Cloud Run service URL"
  value       = module.motorscope.cloud_run_service_url
}

output "cloud_run_service_name" {
  description = "Cloud Run service name"
  value       = module.motorscope.cloud_run_service_name
}

output "service_account_email" {
  description = "Service account email for Cloud Run"
  value       = module.motorscope.service_account_email
}

output "storage_bucket_name" {
  description = "Storage bucket name"
  value       = module.motorscope.storage_bucket_name
}

output "storage_bucket_url" {
  description = "Storage bucket URL"
  value       = module.motorscope.storage_bucket_url
}

output "firestore_database_id" {
  description = "Firestore database ID"
  value       = module.motorscope.firestore_database_id
}

output "artifact_registry_repository" {
  description = "Artifact Registry repository URL"
  value       = module.motorscope.artifact_registry_repository
}

output "secret_references" {
  description = "Secret Manager secret references"
  value       = module.motorscope.secret_references
}

output "build_trigger_manual_name" {
  description = "Manual Cloud Build trigger name"
  value       = module.motorscope.build_trigger_manual_name
}

output "build_trigger_manual_id" {
  description = "Manual Cloud Build trigger ID"
  value       = module.motorscope.build_trigger_manual_id
}

