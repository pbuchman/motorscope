# =============================================================================
# Cloud Run Module Outputs
# =============================================================================

output "service_name" {
  description = "Cloud Run service name"
  value       = google_cloud_run_v2_service.api.name
}

output "service_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.api.uri
}

output "service_id" {
  description = "Cloud Run service ID"
  value       = google_cloud_run_v2_service.api.id
}

output "latest_revision" {
  description = "Latest revision name"
  value       = google_cloud_run_v2_service.api.latest_ready_revision
}
