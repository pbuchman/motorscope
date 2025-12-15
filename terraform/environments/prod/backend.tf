# =============================================================================
# Terraform Backend Configuration - Production Environment
# =============================================================================

terraform {
  backend "gcs" {
    bucket = "motorscope-prod-terraform-state"
    prefix = "env/prod"
  }
}

