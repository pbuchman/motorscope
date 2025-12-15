# =============================================================================
# Artifact Registry Module Variables
# =============================================================================

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "repository_name" {
  description = "Artifact Registry repository name"
  type        = string
  default     = "motorscope"
}

variable "location" {
  description = "Repository location/region"
  type        = string
  default     = "europe-central2"
}

variable "labels" {
  description = "Labels to apply to resources"
  type        = map(string)
  default     = {}
}
