# =============================================================================
# Artifact Registry Module - Container Image Repository
# =============================================================================
# Creates Artifact Registry repository for Docker container images.

# =============================================================================
# Artifact Registry Repository
# =============================================================================

resource "google_artifact_registry_repository" "main" {
  project       = var.project_id
  location      = var.location
  repository_id = var.repository_name
  format        = "DOCKER"
  description   = "Docker container images for MotorScope API"

  # Cleanup policy to remove old images
  cleanup_policy_dry_run = false

  cleanup_policies {
    id     = "delete-old-images"
    action = "DELETE"

    condition {
      tag_state  = "UNTAGGED"
      older_than = "2592000s" # 30 days
    }
  }

  cleanup_policies {
    id     = "keep-recent-tagged"
    action = "KEEP"

    most_recent_versions {
      keep_count = 10
    }
  }

  labels = var.labels
}
