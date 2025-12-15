# =============================================================================
# Cloud Build Trigger Module Outputs
# =============================================================================

output "trigger_id" {
  description = "Cloud Build trigger ID (webhook trigger, dev only)"
  value       = length(google_cloudbuild_trigger.api_deploy) > 0 ? google_cloudbuild_trigger.api_deploy[0].trigger_id : null
}

output "trigger_name" {
  description = "Cloud Build trigger name (webhook trigger, dev only)"
  value       = length(google_cloudbuild_trigger.api_deploy) > 0 ? google_cloudbuild_trigger.api_deploy[0].name : null
}

output "manual_trigger_id" {
  description = "Manual Cloud Build trigger ID"
  value       = google_cloudbuild_trigger.api_deploy_manual.trigger_id
}

output "manual_trigger_name" {
  description = "Manual Cloud Build trigger name"
  value       = google_cloudbuild_trigger.api_deploy_manual.name
}

