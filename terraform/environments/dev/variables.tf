# =============================================================================
# Development Environment - Variables
# =============================================================================

variable "project_id" {
  description = "GCP project ID for development environment"
  type        = string
}

variable "storage_bucket_name" {
  description = "Cloud Storage bucket name for images (must be globally unique)"
  type        = string
}
