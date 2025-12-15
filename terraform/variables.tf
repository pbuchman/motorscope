# =============================================================================
# Root Module Variables
# =============================================================================
# Variables used across the Terraform configuration.
# Actual values are set in environment-specific tfvars files.

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "Primary GCP region for resources"
  type        = string
  default     = "europe-west1"
}

variable "environment" {
  description = "Environment name (development, production)"
  type        = string
  validation {
    condition     = contains(["development", "production"], var.environment)
    error_message = "Environment must be 'development' or 'production'."
  }
}

variable "firestore_database_id" {
  description = "Firestore database ID"
  type        = string
  default     = "motorscopedb"
}

variable "firestore_location" {
  description = "Firestore database location"
  type        = string
  default     = "europe-west1"
}

variable "storage_bucket_name" {
  description = "Cloud Storage bucket name for images"
  type        = string
}

variable "cloud_run_service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "motorscope-api"
}

variable "cloud_run_region" {
  description = "Cloud Run deployment region"
  type        = string
  default     = "europe-west1"
}

variable "cloud_run_memory" {
  description = "Cloud Run service memory allocation"
  type        = string
  default     = "512Mi"
}

variable "cloud_run_cpu" {
  description = "Cloud Run service CPU allocation"
  type        = string
  default     = "1"
}

variable "cloud_run_min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 0
}

variable "cloud_run_max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 10
}

variable "image_deletion_days" {
  description = "Number of days before deleted images are purged from storage"
  type        = number
  default     = 30
}

variable "artifact_registry_repository" {
  description = "Artifact Registry repository name"
  type        = string
  default     = "motorscope"
}

variable "labels" {
  description = "Common labels to apply to all resources"
  type        = map(string)
  default     = {}
}
