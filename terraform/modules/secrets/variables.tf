# =============================================================================
# Secrets Module Variables
# =============================================================================

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
}

variable "labels" {
  description = "Labels to apply to resources"
  type        = map(string)
  default     = {}
}

variable "secret_accessor_email" {
  description = "Email of the service account that needs access to secrets"
  type        = string
}
