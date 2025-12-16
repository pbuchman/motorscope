# =============================================================================
# Storage Module - Cloud Storage Bucket Configuration
# =============================================================================
# Creates and configures Cloud Storage bucket for listing images.
# Images are stored publicly accessible at:
# https://storage.googleapis.com/{bucket}/listings/{listingId}/{filename}

# =============================================================================
# Cloud Storage Bucket
# =============================================================================

resource "google_storage_bucket" "images" {
  project  = var.project_id
  name     = var.bucket_name
  location = var.location

  # Storage class - Standard is optimal for frequently accessed data
  storage_class = "STANDARD"

  # Uniform bucket-level access (recommended for security)
  uniform_bucket_level_access = true

  # Allow public access for images (required for direct browser access)
  public_access_prevention = "inherited"

  # Versioning (disabled to save storage costs)
  versioning {
    enabled = false
  }

  # Lifecycle rules for automatic cleanup
  lifecycle_rule {
    condition {
      age            = var.image_deletion_days
      matches_prefix = ["listings/deleted/"]
    }
    action {
      type = "Delete"
    }
  }

  # Soft delete policy (keep deleted objects for recovery)
  soft_delete_policy {
    retention_duration_seconds = var.soft_delete_retention_days * 86400
  }

  # Labels
  labels = merge(var.labels, {
    purpose = "listing-images"
  })

  # Force destroy for dev (should be false for production)
  force_destroy = var.force_destroy
}

# =============================================================================
# IAM Binding - Grant Storage Admin to Service Account
# =============================================================================

resource "google_storage_bucket_iam_member" "storage_admin" {
  bucket = google_storage_bucket.images.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${var.storage_admin_email}"
}

# =============================================================================
# IAM Binding - Grant Public Read Access to All Objects
# =============================================================================

resource "google_storage_bucket_iam_member" "public_read" {
  bucket = google_storage_bucket.images.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

