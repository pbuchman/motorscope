# =============================================================================
# Storage Module Outputs
# =============================================================================

output "bucket_name" {
  description = "Cloud Storage bucket name"
  value       = google_storage_bucket.images.name
}

output "bucket_url" {
  description = "Cloud Storage bucket URL"
  value       = google_storage_bucket.images.url
}

output "bucket_self_link" {
  description = "Cloud Storage bucket self link"
  value       = google_storage_bucket.images.self_link
}
