# =============================================================================
# Artifact Registry Module Outputs
# =============================================================================

output "repository_id" {
  description = "Artifact Registry repository ID"
  value       = google_artifact_registry_repository.main.repository_id
}

output "repository_name" {
  description = "Full resource name of the repository"
  value       = google_artifact_registry_repository.main.name
}

output "repository_url" {
  description = "URL to access the repository"
  value       = "${var.location}-docker.pkg.dev/${var.project_id}/${var.repository_name}"
}
