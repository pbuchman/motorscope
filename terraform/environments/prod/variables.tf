# =============================================================================
# Production Environment Variables
# =============================================================================

variable "project_id" {
  description = "GCP project ID"
  type        = string
  default     = "motorscope-prod"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "europe-west1"
}

variable "cloud_run_region" {
  description = "GCP region for Cloud Run"
  type        = string
  default     = "europe-west1"
}

variable "cloud_run_service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "motorscope-api"
}

variable "cloud_run_min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 1
}

variable "cloud_run_max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 10
}

variable "storage_bucket_name" {
  description = "Cloud Storage bucket name (must be globally unique)"
  type        = string
  default     = "motorscope-prod-images"
}

variable "firestore_database_id" {
  description = "Firestore database ID"
  type        = string
  default     = "motorscopedb"
}

variable "artifact_registry_repository" {
  description = "Artifact Registry repository name"
  type        = string
  default     = "motorscope"
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


variable "build_trigger_branch" {
  description = "Git branch for build triggers"
  type        = string
  default     = "main"
}

