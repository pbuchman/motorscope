/**
 * Database Migration System
 *
 * This module provides a simple migration system for Firestore.
 * Migrations are tracked in a `_migrations` collection to ensure
 * each migration runs only once, even across multiple Cloud Run instances.
 *
 * Key features:
 * - Idempotent: Safe to call on every startup
 * - Distributed-safe: Uses Firestore transactions to prevent race conditions
 * - Ordered: Migrations run in order by their ID
 */

import { Firestore, Timestamp } from '@google-cloud/firestore';
import {
  GCP_PROJECT_ID,
  FIRESTORE_DATABASE_ID,
  FIRESTORE_LISTINGS_COLLECTION,
} from './config.js';

// Initialize Firestore
const firestore = new Firestore({
  projectId: GCP_PROJECT_ID,
  databaseId: FIRESTORE_DATABASE_ID,
});

// Collection for tracking applied migrations
const MIGRATIONS_COLLECTION = '_migrations';
const migrationsCollection = firestore.collection(MIGRATIONS_COLLECTION);

// Firestore batch limit
const BATCH_SIZE = 500;

/**
 * Migration definition
 */
export interface Migration {
  /** Unique migration ID (use format: YYYYMMDD_description) */
  id: string;
  /** Human-readable description */
  description: string;
  /** Migration function to execute */
  up: (db: Firestore) => Promise<void>;
}

/**
 * Migration record stored in Firestore
 */
interface MigrationRecord {
  id: string;
  description: string;
  appliedAt: Timestamp;
  durationMs: number;
}

// =============================================================================
// Migration Definitions
// =============================================================================

const migrations: Migration[] = [
  {
    id: '20241209_status_sold_expired_to_ended',
    description: 'Migrate listing statuses from sold/expired to ENDED',
    up: async (db: Firestore) => {
      const listingsCollection = db.collection(FIRESTORE_LISTINGS_COLLECTION);
      const oldStatuses = ['sold', 'expired', 'SOLD', 'EXPIRED'];
      const newStatus = 'ENDED';

      let totalUpdated = 0;

      for (const oldStatus of oldStatuses) {
        const snapshot = await listingsCollection
          .where('status', '==', oldStatus)
          .get();

        if (snapshot.empty) {
          continue;
        }

        console.log(`  Found ${snapshot.size} document(s) with status "${oldStatus}"`);

        // Process in batches
        const docs = snapshot.docs;
        for (let i = 0; i < docs.length; i += BATCH_SIZE) {
          const batch = db.batch();
          const batchDocs = docs.slice(i, i + BATCH_SIZE);

          for (const doc of batchDocs) {
            batch.update(doc.ref, { status: newStatus });
          }

          await batch.commit();
        }

        totalUpdated += snapshot.size;
      }

      console.log(`  Updated ${totalUpdated} document(s) to status "${newStatus}"`);
    }
  },
];

// =============================================================================
// Migration Runner
// =============================================================================

/**
 * Check if a migration has already been applied
 */
async function isMigrationApplied(migrationId: string): Promise<boolean> {
  const doc = await migrationsCollection.doc(migrationId).get();
  return doc.exists;
}

/**
 * Record that a migration has been applied
 */
async function recordMigration(
  migration: Migration,
  durationMs: number
): Promise<void> {
  const record: MigrationRecord = {
    id: migration.id,
    description: migration.description,
    appliedAt: Timestamp.now(),
    durationMs,
  };
  await migrationsCollection.doc(migration.id).set(record);
}

/**
 * Run a single migration with locking to prevent concurrent execution
 */
async function runMigrationWithLock(migration: Migration): Promise<boolean> {
  const lockRef = migrationsCollection.doc(`${migration.id}_lock`);
  const migrationRef = migrationsCollection.doc(migration.id);

  try {
    // Use a transaction to ensure only one instance runs the migration
    const result = await firestore.runTransaction(async (transaction) => {
      const migrationDoc = await transaction.get(migrationRef);

      // Already applied
      if (migrationDoc.exists) {
        return { applied: false, reason: 'already_applied' };
      }

      const lockDoc = await transaction.get(lockRef);

      // Another instance is running this migration
      if (lockDoc.exists) {
        const lockData = lockDoc.data();
        const lockTime = lockData?.lockedAt?.toDate();
        const lockAge = lockTime ? Date.now() - lockTime.getTime() : Infinity;

        // If lock is older than 5 minutes, consider it stale and proceed
        if (lockAge < 5 * 60 * 1000) {
          return { applied: false, reason: 'locked' };
        }
      }

      // Acquire lock
      transaction.set(lockRef, {
        lockedAt: Timestamp.now(),
        lockedBy: process.env.K_REVISION || 'local',
      });

      return { applied: true, reason: 'proceed' };
    });

    if (!result.applied) {
      if (result.reason === 'already_applied') {
        console.log(`  ✓ Migration ${migration.id} already applied`);
      } else {
        console.log(`  ⏳ Migration ${migration.id} is being applied by another instance`);
      }
      return false;
    }

    // Run the migration
    console.log(`  → Running migration: ${migration.id}`);
    console.log(`    ${migration.description}`);

    const startTime = Date.now();
    await migration.up(firestore);
    const durationMs = Date.now() - startTime;

    // Record completion
    await recordMigration(migration, durationMs);

    // Remove lock
    await lockRef.delete();

    console.log(`  ✓ Migration ${migration.id} completed in ${durationMs}ms`);
    return true;
  } catch (error) {
    // Clean up lock on error
    try {
      await lockRef.delete();
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Run all pending migrations
 * Called on application startup
 */
export async function runMigrations(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Running database migrations...');
  console.log('='.repeat(60));

  const pendingMigrations: Migration[] = [];

  // Check which migrations need to be applied
  for (const migration of migrations) {
    const applied = await isMigrationApplied(migration.id);
    if (!applied) {
      pendingMigrations.push(migration);
    }
  }

  if (pendingMigrations.length === 0) {
    console.log('No pending migrations');
    console.log('='.repeat(60));
    return;
  }

  console.log(`Found ${pendingMigrations.length} pending migration(s)`);

  let appliedCount = 0;
  let errorCount = 0;

  // Run migrations in order
  for (const migration of pendingMigrations) {
    try {
      const wasApplied = await runMigrationWithLock(migration);
      if (wasApplied) {
        appliedCount++;
      }
    } catch (error) {
      errorCount++;
      console.error(`  ✗ Migration ${migration.id} failed:`, error);
      // Continue with other migrations - don't block startup
      // In production, you might want to alert on this
    }
  }

  console.log('='.repeat(60));
  console.log(`Migrations complete: ${appliedCount} applied, ${errorCount} errors`);
  console.log('='.repeat(60));
}

/**
 * Get list of all migrations with their status
 */
export async function getMigrationStatus(): Promise<
  Array<{ id: string; description: string; applied: boolean; appliedAt?: Date }>
> {
  const status: Array<{
    id: string;
    description: string;
    applied: boolean;
    appliedAt?: Date;
  }> = [];

  for (const migration of migrations) {
    const doc = await migrationsCollection.doc(migration.id).get();
    const data = doc.data() as MigrationRecord | undefined;

    status.push({
      id: migration.id,
      description: migration.description,
      applied: doc.exists,
      appliedAt: data?.appliedAt?.toDate(),
    });
  }

  return status;
}

