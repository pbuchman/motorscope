# =============================================================================
# Firestore Module - Database Configuration
# =============================================================================
# Creates and configures Firestore database in Native mode.

# =============================================================================
# Firestore Database
# =============================================================================

resource "google_firestore_database" "main" {
  project     = var.project_id
  name        = var.database_id
  location_id = var.location
  type        = "FIRESTORE_NATIVE"

  # Concurrency mode - PESSIMISTIC provides strong consistency
  concurrency_mode = "PESSIMISTIC"

  # App Engine integration disabled (we use Cloud Run)
  app_engine_integration_mode = "DISABLED"

  # Point-in-time recovery disabled (can be enabled for production if needed)
  point_in_time_recovery_enablement = "POINT_IN_TIME_RECOVERY_DISABLED"

  # Delete protection disabled for dev (should be enabled for production)
  delete_protection_state = var.delete_protection ? "DELETE_PROTECTION_ENABLED" : "DELETE_PROTECTION_DISABLED"
}

# =============================================================================
# Firestore TTL Policy for Token Blacklist
# =============================================================================
# Automatically delete expired blacklisted tokens

resource "google_firestore_field" "token_blacklist_ttl" {
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "token_blacklist"
  field      = "expireAt"

  # TTL configuration
  ttl_config {}

  # Index configuration (required by API)
  index_config {}
}

# =============================================================================
# Firestore Indexes
# =============================================================================
# Indexes for efficient queries

# Index for listings by userId
resource "google_firestore_index" "listings_by_user" {
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "listings"

  fields {
    field_path = "userId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "__name__"
    order      = "ASCENDING"
  }
}

# Index for gemini_history by userId and timestamp
resource "google_firestore_index" "gemini_history_by_user" {
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "gemini_history"

  fields {
    field_path = "userId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "timestamp"
    order      = "DESCENDING"
  }
}

# Index for token_blacklist expiration cleanup
resource "google_firestore_index" "token_blacklist_expiry" {
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "token_blacklist"

  fields {
    field_path = "expireAt"
    order      = "ASCENDING"
  }

  fields {
    field_path = "__name__"
    order      = "ASCENDING"
  }
}
