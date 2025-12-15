# =============================================================================
# Cloud Build Trigger Module Variables
# =============================================================================

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
}

variable "service_account_email" {
  description = "Service account email for Cloud Build executions"
  type        = string
}

variable "webhook_secret_id" {
  description = "Secret Manager secret ID for GitHub webhook"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run deployment"
  type        = string
}

variable "github_owner" {
  description = "GitHub repository owner"
  type        = string
  default     = "pbuchman"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "motorscope"
}

variable "branch" {
  description = "Git branch to trigger builds on"
  type        = string
}


variable "artifact_registry_repository" {
  description = "Artifact Registry repository name"
  type        = string
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
}

variable "gcs_bucket_name" {
  description = "GCS bucket name for the environment"
  type        = string
}
