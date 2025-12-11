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
import statusSoldExpiredToEnded from './20241209_status_sold_expired_to_ended.js';

export const migrations: Migration[] = [
    statusSoldExpiredToEnded,
];
