# =============================================================================
# Secrets Module - Secret Manager Configuration
# =============================================================================
# Creates Secret Manager secrets for sensitive configuration.
# IMPORTANT: Secret VALUES must be set manually in GCP Console or via gcloud.
# This Terraform only creates the secret containers, not the values themselves.

# =============================================================================
# JWT Secret
# =============================================================================

resource "google_secret_manager_secret" "jwt_secret" {
  project   = var.project_id
  secret_id = "jwt-secret"

  labels = merge(var.labels, {
    environment = var.environment
    purpose     = "authentication"
  })

  replication {
    auto {}
  }
}

# =============================================================================
# OAuth Client ID Secret
# =============================================================================

resource "google_secret_manager_secret" "oauth_client_id" {
  project   = var.project_id
  secret_id = "oauth-client-id"

  labels = merge(var.labels, {
    environment = var.environment
    purpose     = "authentication"
  })

  replication {
    auto {}
  }
}

# =============================================================================
# Allowed Origin Extension Secret
# =============================================================================

resource "google_secret_manager_secret" "allowed_origin_extension" {
  project   = var.project_id
  secret_id = "allowed-origin-extension"

  labels = merge(var.labels, {
    environment = var.environment
    purpose     = "cors"
  })

  replication {
    auto {}
  }
}

# =============================================================================
# IAM Bindings - Grant access to service account
# =============================================================================

resource "google_secret_manager_secret_iam_member" "jwt_secret_accessor" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.jwt_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.secret_accessor_email}"
}

resource "google_secret_manager_secret_iam_member" "oauth_client_id_accessor" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.oauth_client_id.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.secret_accessor_email}"
}

resource "google_secret_manager_secret_iam_member" "allowed_origin_accessor" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.allowed_origin_extension.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.secret_accessor_email}"
}
