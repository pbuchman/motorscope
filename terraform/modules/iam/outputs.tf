# =============================================================================
# IAM Module Outputs
# =============================================================================

output "cloud_run_service_account_email" {
  description = "Email of the Cloud Run service account"
  value       = google_service_account.cloud_run.email
}

output "cloud_run_service_account_name" {
  description = "Cloud Run service account resource name"
  value       = google_service_account.cloud_run.name
}

output "cloud_build_service_account_id" {
  description = "Cloud Build service account ID (project number based)"
  value       = local.cloud_build_service_account
}

output "cloud_build_service_account_email" {
  description = "Cloud Build service account email"
  value       = local.cloud_build_service_account
}

output "cloud_build_service_account" {
  description = "Email of the Cloud Build service account"
  value       = local.cloud_build_service_account
}
