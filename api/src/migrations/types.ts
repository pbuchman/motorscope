/**
 * Migration Types
 *
 * Shared type definitions for the migration system.
 */

import { Firestore } from '@google-cloud/firestore';

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
export interface MigrationRecord {
  id: string;
  description: string;
  appliedAt: import('@google-cloud/firestore').Timestamp;
  durationMs: number;
}

