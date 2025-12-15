# =============================================================================
# Cloud Build Trigger Module
# =============================================================================
# Webhook-based trigger with 2nd gen repository (dev only)
# Production uses manual trigger only

data "google_project" "project" {
  project_id = var.project_id
}

# Automatic webhook trigger (development only)
resource "google_cloudbuild_trigger" "api_deploy" {
  count = var.environment == "dev" ? 1 : 0

  project  = var.project_id
  name     = "motorscope-api-deploy-${var.environment}"
  location = var.region

  # Webhook configuration (uses project number, not ID)
  webhook_config {
    secret = "projects/${data.google_project.project.number}/secrets/${var.webhook_secret_id}/versions/1"
  }

  # Source repository (2nd gen)
  source_to_build {
    repository = "projects/${var.project_id}/locations/${var.region}/connections/github/repositories/${var.github_owner}-${var.github_repo}"
    ref        = "refs/heads/${var.branch}"
    repo_type  = "GITHUB"
  }

  # Build configuration file location (2nd gen)
  git_file_source {
    path       = "api/cloudbuild.yaml"
    repository = "projects/${var.project_id}/locations/${var.region}/connections/github/repositories/${var.github_owner}-${var.github_repo}"
    revision   = "refs/heads/${var.branch}"
    repo_type  = "GITHUB"
  }

  # Service account for builds
  service_account = "projects/${var.project_id}/serviceAccounts/${var.service_account_email}"

  # Filter by pusher name
  filter = "_PUSHER_NAME.matches(\"^${var.allowed_pusher}$\")"

  # Substitutions
  substitutions = {
    _PUSHER_NAME = "$(body.pusher.name)"
  }

  lifecycle {
    ignore_changes = [
      source_to_build[0].repo_type,
      git_file_source[0].repo_type,
    ]
  }
}

# =============================================================================
# Manual Trigger
# =============================================================================
# Available in all environments for controlled deployments

resource "google_cloudbuild_trigger" "api_deploy_manual" {
  project  = var.project_id
  name     = "motorscope-api-deploy-${var.environment}-manual"
  location = var.region

  # Source repository (2nd gen)
  source_to_build {
    repository = "projects/${var.project_id}/locations/${var.region}/connections/github/repositories/${var.github_owner}-${var.github_repo}"
    ref        = "refs/heads/${var.branch}"
    repo_type  = "GITHUB"
  }

  # Build configuration file location (2nd gen)
  git_file_source {
    path       = "api/cloudbuild.yaml"
    repository = "projects/${var.project_id}/locations/${var.region}/connections/github/repositories/${var.github_owner}-${var.github_repo}"
    revision   = "refs/heads/${var.branch}"
    repo_type  = "GITHUB"
  }

  # Service account for builds
  service_account = "projects/${var.project_id}/serviceAccounts/${var.service_account_email}"

  # No webhook, no filters - manual trigger only
  # Users can trigger this manually from Cloud Console or gcloud CLI

  lifecycle {
    ignore_changes = [
      source_to_build[0].repo_type,
      git_file_source[0].repo_type,
    ]
  }
}

