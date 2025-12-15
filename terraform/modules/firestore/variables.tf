# =============================================================================
# Firestore Module Variables
# =============================================================================

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "database_id" {
  description = "Firestore database ID"
  type        = string
  default     = "motorscopedb"
}

variable "location" {
  description = "Firestore database location"
  type        = string
  default     = "europe-west1"
}

variable "labels" {
  description = "Labels to apply to resources"
  type        = map(string)
  default     = {}
}

variable "delete_protection" {
  description = "Enable delete protection for the database"
  type        = bool
  default     = false
}
