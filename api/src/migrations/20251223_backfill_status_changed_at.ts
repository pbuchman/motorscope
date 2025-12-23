/**
 * Migration: Backfill statusChangedAt for ENDED Listings
 *
 * For existing ENDED listings that don't have statusChangedAt set,
 * backfill from lastSeenAt to establish a baseline for grace period calculations.
 *
 * This enables the "ENDED listing grace period" feature which excludes
 * listings from auto-refresh after they've been ENDED for a configurable
 * number of days (default 3 days).
 */

import {Firestore} from '@google-cloud/firestore';
import {FIRESTORE_LISTINGS_COLLECTION} from '../config.js';
import type {Migration} from './types.js';

// Firestore batch limit
const BATCH_SIZE = 500;

const migration: Migration = {
    id: '20251223_backfill_status_changed_at',
    description: 'Backfill statusChangedAt from lastSeenAt for existing ENDED listings',
    up: async (db: Firestore): Promise<void> => {
        const listingsCollection = db.collection(FIRESTORE_LISTINGS_COLLECTION);

        // Find all ENDED listings that don't have statusChangedAt set
        const snapshot = await listingsCollection
            .where('status', '==', 'ENDED')
            .get();

        if (snapshot.empty) {
            console.log('  No ENDED listings found - nothing to migrate');
            return;
        }

        // Filter to only docs without statusChangedAt
        const docsToUpdate = snapshot.docs.filter(doc => {
            const data = doc.data();
            return data.statusChangedAt === undefined || data.statusChangedAt === null;
        });

        if (docsToUpdate.length === 0) {
            console.log(`  Found ${snapshot.size} ENDED listing(s), all already have statusChangedAt set`);
            return;
        }

        console.log(`  Found ${docsToUpdate.length} ENDED listing(s) without statusChangedAt (of ${snapshot.size} total)`);

        // Process in batches
        let totalUpdated = 0;
        for (let i = 0; i < docsToUpdate.length; i += BATCH_SIZE) {
            const batch = db.batch();
            const batchDocs = docsToUpdate.slice(i, i + BATCH_SIZE);

            for (const doc of batchDocs) {
                const data = doc.data();
                // Use lastSeenAt as the statusChangedAt baseline
                // This is the best approximation we have for when the listing ended
                const statusChangedAt = data.lastSeenAt || new Date().toISOString();
                batch.update(doc.ref, {statusChangedAt});
            }

            await batch.commit();
            totalUpdated += batchDocs.length;
            console.log(`  Processed batch: ${totalUpdated}/${docsToUpdate.length}`);
        }

        console.log(`  Migrated ${totalUpdated} listing(s) - set statusChangedAt from lastSeenAt`);
    },
};

export default migration;

