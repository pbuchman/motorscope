# =============================================================================
# Cloud Build Connection Variables
# =============================================================================

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "connection_name" {
  description = "Name of the existing Cloud Build connection (created via console)"
  type        = string
  default     = "github-connection"
}

variable "repository_name" {
  description = "Name of the repository in Cloud Build format (owner-repo)"
  type        = string
}

