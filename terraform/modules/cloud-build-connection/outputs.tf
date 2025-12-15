# =============================================================================
# Cloud Build Connection Outputs
# =============================================================================

output "connection_name" {
  description = "Cloud Build connection name"
  value       = data.google_cloudbuildv2_connection.github.name
}

output "connection_id" {
  description = "Cloud Build connection ID"
  value       = data.google_cloudbuildv2_connection.github.id
}

output "repository_id" {
  description = "Cloud Build repository ID"
  value       = data.google_cloudbuildv2_repository.motorscope.id
}

