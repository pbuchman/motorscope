# =============================================================================
# Cloud Build Trigger Module
# =============================================================================
# Uses GitHub integration (requires GitHub App to be connected via console first)
resource "google_cloudbuild_trigger" "api_deploy" {
  project     = var.project_id
  name        = "motorscope-api-deploy-${var.environment}"
  description = "Build and deploy motorscope-api on push to ${var.branch}"
  location    = var.region
  github {
    owner = var.github_owner
    name  = var.github_repo
    push {
      branch = "^${var.branch}$"
    }
  }
  filename = "api/cloudbuild.yaml"
  included_files = [
    "api/**"
  ]
  substitutions = {
    _REGION       = var.region
    _REPOSITORY   = var.artifact_registry_repository
    _SERVICE_NAME = var.service_name
  }
  tags = [
    "api",
    "deployment",
    var.environment
  ]
}
