# =============================================================================
# IAM Module - Service Accounts and Permissions
# =============================================================================
# Creates service accounts and configures IAM bindings for MotorScope services.

# =============================================================================
# Cloud Run Service Account
# =============================================================================

resource "google_service_account" "cloud_run" {
  project      = var.project_id
  account_id   = "motorscope-api-${var.environment}"
  display_name = "MotorScope API Service Account (${var.environment})"
  description  = "Service account for MotorScope API Cloud Run service in ${var.environment} environment"
}

# =============================================================================
# IAM Bindings for Cloud Run Service Account
# =============================================================================

# Firestore access
resource "google_project_iam_member" "cloud_run_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Cloud Storage access (admin for bucket operations and object management)
resource "google_project_iam_member" "cloud_run_storage" {
  project = var.project_id
  role    = "roles/storage.admin"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Secret Manager access
resource "google_project_iam_member" "cloud_run_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Logging access
resource "google_project_iam_member" "cloud_run_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# =============================================================================
# Cloud Build Service Account Permissions
# =============================================================================
# The default Cloud Build service account needs additional permissions to deploy

# Get the default Cloud Build service account
data "google_project" "project" {
  project_id = var.project_id
}

locals {
  cloud_build_service_account = "${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
}

# Allow Cloud Build to deploy to Cloud Run
resource "google_project_iam_member" "cloudbuild_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${local.cloud_build_service_account}"
}

# Allow Cloud Build to impersonate the Cloud Run service account
resource "google_service_account_iam_member" "cloudbuild_sa_user" {
  service_account_id = google_service_account.cloud_run.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${local.cloud_build_service_account}"
}

# Allow Cloud Build to push to Artifact Registry
resource "google_project_iam_member" "cloudbuild_artifact_registry" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${local.cloud_build_service_account}"
}

# Allow Cloud Build to access secrets (for deployment)
resource "google_project_iam_member" "cloudbuild_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${local.cloud_build_service_account}"
}

# Allow Cloud Run service account to push to Artifact Registry (used by Cloud Build trigger)
resource "google_project_iam_member" "cloud_run_artifact_registry" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

