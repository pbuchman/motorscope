# =============================================================================
# Firestore Module Outputs
# =============================================================================

output "database_id" {
  description = "Firestore database ID"
  value       = google_firestore_database.main.name
}

output "database_location" {
  description = "Firestore database location"
  value       = google_firestore_database.main.location_id
}
