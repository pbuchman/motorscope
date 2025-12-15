# =============================================================================
# Storage Module Variables
# =============================================================================

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "bucket_name" {
  description = "Cloud Storage bucket name (must be globally unique)"
  type        = string
}

variable "location" {
  description = "Bucket location/region"
  type        = string
  default     = "europe-west1"
}

variable "image_deletion_days" {
  description = "Number of days before deleted images are purged"
  type        = number
  default     = 30
}

variable "labels" {
  description = "Labels to apply to resources"
  type        = map(string)
  default     = {}
}

variable "storage_admin_email" {
  description = "Email of service account that needs storage admin access"
  type        = string
}

variable "force_destroy" {
  description = "Allow bucket deletion even if not empty (use only for dev)"
  type        = bool
  default     = false
}
