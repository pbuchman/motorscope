/**
 * Migration: Status Sold/Expired to Ended
 *
 * Migrates listing statuses from legacy values (sold, expired, SOLD, EXPIRED)
 * to the standardized ENDED status.
 */

import {Firestore} from '@google-cloud/firestore';
import {FIRESTORE_LISTINGS_COLLECTION} from '../config.js';
import type {Migration} from './types.js';

// Firestore batch limit
const BATCH_SIZE = 500;

const migration: Migration = {
    id: '20241209_status_sold_expired_to_ended',
    description: 'Migrate listing statuses from sold/expired to ENDED',
    up: async (db: Firestore): Promise<void> => {
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
                    batch.update(doc.ref, {status: newStatus});
                }

                await batch.commit();
            }

            totalUpdated += snapshot.size;
        }

        console.log(`  Updated ${totalUpdated} document(s) to status "${newStatus}"`);
    },
};

export default migration;

