/**
 * Migration Registry
 *
 * Exports all migration definitions from dedicated files.
 * Migrations are ordered by ID (date-prefixed).
 *
 * To add a new migration:
 * 1. Create a new file with format: YYYYMMDD_description.ts
 * 2. Export default a Migration object
 * 3. Import and add to the migrations array below
 */

import type {Migration} from './types.js';
import statusSoldExpiredToEnded from './20251209_status_sold_expired_to_ended.js';
import backfillStatusChangedAt from './20251223_backfill_status_changed_at.js';

export const migrations: Migration[] = [
    statusSoldExpiredToEnded,
    backfillStatusChangedAt,
];
