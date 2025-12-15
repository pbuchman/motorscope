# =============================================================================
# Cloud Run Module Variables
# =============================================================================

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
}

variable "region" {
  description = "Cloud Run deployment region"
  type        = string
  default     = "europe-central2"
}

variable "memory" {
  description = "Memory allocation for the service"
  type        = string
  default     = "512Mi"
}

variable "cpu" {
  description = "CPU allocation for the service"
  type        = string
  default     = "1"
}

variable "min_instances" {
  description = "Minimum number of instances"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum number of instances"
  type        = number
  default     = 10
}

variable "container_image" {
  description = "Container image to deploy"
  type        = string
}

variable "service_account_email" {
  description = "Service account email to run the service as"
  type        = string
}

variable "environment_variables" {
  description = "Environment variables for the container"
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "Secret Manager secrets to mount as environment variables (key = env var name, value = secret ID)"
  type        = map(string)
  default     = {}
}

variable "labels" {
  description = "Labels to apply to resources"
  type        = map(string)
  default     = {}
}

variable "deletion_protection" {
  description = "Enable deletion protection for the service"
  type        = bool
  default     = false
}

variable "request_timeout" {
  description = "Maximum request timeout duration"
  type        = string
  default     = "300s"
}
