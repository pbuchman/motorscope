# =============================================================================
# Cloud Build GitHub Connection (Manual Setup)
# =============================================================================
# This assumes you've already connected GitHub through the console.
# Go to: https://console.cloud.google.com/cloud-build/triggers/connect
# and connect your GitHub repository ONCE.
data "google_cloudbuildv2_connection" "github" {
  project  = var.project_id
  location = var.region
  name     = var.connection_name
}
data "google_cloudbuildv2_repository" "motorscope" {
  project           = var.project_id
  location          = var.region
  name              = var.repository_name
  parent_connection = data.google_cloudbuildv2_connection.github.name
}
