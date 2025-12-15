# =============================================================================
# Secrets Module Outputs
# =============================================================================

output "jwt_secret_id" {
  description = "Secret Manager secret ID for JWT secret"
  value       = google_secret_manager_secret.jwt_secret.secret_id
}

output "jwt_secret_name" {
  description = "Full resource name of JWT secret"
  value       = google_secret_manager_secret.jwt_secret.name
}

output "oauth_client_id_secret_id" {
  description = "Secret Manager secret ID for OAuth client ID"
  value       = google_secret_manager_secret.oauth_client_id.secret_id
}

output "oauth_client_id_secret_name" {
  description = "Full resource name of OAuth client ID secret"
  value       = google_secret_manager_secret.oauth_client_id.name
}

output "allowed_origin_extension_secret_id" {
  description = "Secret ID for allowed origin extension"
  value       = google_secret_manager_secret.allowed_origin_extension.secret_id
}

output "github_webhook_secret_id" {
  description = "Secret ID for GitHub webhook secret"
  value       = google_secret_manager_secret.github_webhook_secret.secret_id
}

output "allowed_origin_extension_secret_name" {
  description = "Full resource name of allowed origin extension secret"
  value       = google_secret_manager_secret.allowed_origin_extension.name
}
