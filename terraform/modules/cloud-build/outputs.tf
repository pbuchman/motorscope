# =============================================================================
# Cloud Build Trigger Module Outputs
# =============================================================================

output "trigger_id" {
  description = "Cloud Build trigger ID"
  value       = google_cloudbuild_trigger.api_deploy.trigger_id
}

output "trigger_name" {
  description = "Cloud Build trigger name"
  value       = google_cloudbuild_trigger.api_deploy.name
}

output "manual_trigger_id" {
  description = "Manual Cloud Build trigger ID"
  value       = google_cloudbuild_trigger.api_deploy_manual.trigger_id
}

output "manual_trigger_name" {
  description = "Manual Cloud Build trigger name"
  value       = google_cloudbuild_trigger.api_deploy_manual.name
}

