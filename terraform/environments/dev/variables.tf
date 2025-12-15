# =============================================================================
# Development Environment - Variables
# =============================================================================
# All variables without defaults MUST be set in terraform.tfvars

variable "project_id" {
  description = "GCP project ID (required - no default to force explicit configuration)"
  type        = string
  # No default - must be explicitly set in terraform.tfvars
}

variable "storage_bucket_name" {
  description = "Cloud Storage bucket name (required - must be globally unique)"
  type        = string
  # No default - must be explicitly set in terraform.tfvars
}
