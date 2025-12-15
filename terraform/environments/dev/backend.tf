# =============================================================================
# Development Environment - Terraform Configuration
# =============================================================================
# Backend configuration for storing Terraform state in GCS.

terraform {
  backend "gcs" {
    bucket = "motorscope-dev-terraform-state"
    prefix = "env/dev"
  }
}
