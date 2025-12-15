# =============================================================================
# Cloud Build Trigger Module Variables
# =============================================================================

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, prod)"
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

variable "allowed_pusher" {
  description = "GitHub username allowed to trigger builds (security filter)"
  type        = string
  default     = "pbuchman"
}

variable "artifact_registry_repository" {
  description = "Artifact Registry repository name"
  type        = string
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
}


variable "webhook_secret_id" {
  description = "Secret Manager secret ID for GitHub webhook"
  type        = string
}

