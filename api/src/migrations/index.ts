/**
 * Migration Registry
 *
 * Exports all migration definitions from dedicated files.
 * Migrations are ordered by ID (date-prefixed).
 */

import { Migration } from './types.js';

// Import individual migrations
import * as statusMigration from './20241209_status_sold_expired_to_ended.js';

/**
 * Build Migration object from module exports
 */
function buildMigration(module: { id: string; description: string; up: (db: import('@google-cloud/firestore').Firestore) => Promise<void> }): Migration {
  return {
    id: module.id,
    description: module.description,
    up: module.up,
  };
}

/**
 * All registered migrations in execution order.
 * Add new migrations to this array in chronological order.
 */
export const migrations: Migration[] = [
  buildMigration(statusMigration),
];

