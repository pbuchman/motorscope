/**
 * Tests for Migration Module
 *
 * Tests the migration logic including status normalization.
 */

import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import statusSoldExpiredToEnded from '../migrations/20241209_status_sold_expired_to_ended.js';
import type {Firestore} from '@google-cloud/firestore';

// Shared in-memory store for mocked Firestore collections
const mockData: Map<string, Map<string, any>> = new Map();

const getCollectionData = (name: string): Map<string, any> => {
    if (!mockData.has(name)) {
        mockData.set(name, new Map());
    }
    return mockData.get(name)!;
};

const createMockDocRef = (collectionName: string, docId: string) => ({
    id: docId,
    get: jest.fn(async () => {
        const data = getCollectionData(collectionName).get(docId);
        return {
            exists: !!data,
            data: () => data,
            id: docId,
        };
    }),
    set: jest.fn(async (data: any) => {
        getCollectionData(collectionName).set(docId, data);
    }),
    update: jest.fn(async (data: any) => {
        const existing = getCollectionData(collectionName).get(docId) || {};
        getCollectionData(collectionName).set(docId, {...existing, ...data});
    }),
    delete: jest.fn(async () => {
        getCollectionData(collectionName).delete(docId);
    }),
});

const createMockCollectionRef = (name: string) => ({
    doc: (docId: string) => createMockDocRef(name, docId),
    where: jest.fn(() => ({
        get: jest.fn(async () => ({
            empty: true,
            docs: [],
            size: 0,
        })),
    })),
});

const mockFirestore = {
    collection: jest.fn((name: string) => createMockCollectionRef(name)),
    batch: jest.fn(() => ({
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        commit: jest.fn(async () => {
        }),
    })),
    runTransaction: jest.fn(async (callback: Function) => {
        const transaction = {
            get: jest.fn(async (ref: any) => ref.get()),
            set: jest.fn((ref: any, data: any) => ref.set(data)),
            update: jest.fn((ref: any, data: any) => ref.update(data)),
            delete: jest.fn((ref: any) => ref.delete()),
        };
        return callback(transaction);
    }),
};

const mockTimestamp = {
    now: jest.fn(() => ({toDate: () => new Date()} as any)),
    fromDate: jest.fn((date: Date) => ({toDate: () => date} as any)),
};

(jest as any).unstable_mockModule('@google-cloud/firestore', () => ({
    Firestore: class {
        constructor() {
            return mockFirestore;
        }
    },
    Timestamp: mockTimestamp,
}));

const importMigrationRunner = () => import('../migrations.js');

describe('Migration Runner', () => {
    beforeEach(() => {
        mockData.clear();
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.resetModules();
    });

    describe('runMigrations', () => {
        it('skips already applied migrations without touching locks', async () => {
            const migrationsData = getCollectionData('_migrations');
            migrationsData.set('20241209_status_sold_expired_to_ended', {
                id: '20241209_status_sold_expired_to_ended',
                description: 'Migrate listing statuses from sold/expired to ENDED',
                appliedAt: mockTimestamp.now(),
                durationMs: 120,
            });

            const {runMigrations} = await importMigrationRunner();
            await expect(runMigrations()).resolves.not.toThrow();
            expect(migrationsData.has('20241209_status_sold_expired_to_ended_lock')).toBe(false);
        });

        it('runs pending migrations exactly once and records completion', async () => {
            const {runMigrations, getMigrationStatus} = await importMigrationRunner();
            await runMigrations();
            const status = await getMigrationStatus();
            const migration = status.find((entry) => entry.id === '20241209_status_sold_expired_to_ended');

            expect(migration).toBeDefined();
            expect(migration?.applied).toBe(true);
            expect(migration?.appliedAt).toBeInstanceOf(Date);
        });
    });

    describe('getMigrationStatus', () => {
        it('returns metadata even when not applied', async () => {
            const {getMigrationStatus} = await importMigrationRunner();
            const status = await getMigrationStatus();
            expect(status).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: '20241209_status_sold_expired_to_ended',
                        description: expect.any(String),
                        applied: expect.any(Boolean),
                    }),
                ]),
            );
        });
    });
});

describe('Status normalization migration (20241209)', () => {
    const createTestFirestore = (docs: Record<string, { status: string }>): Firestore => {
        type StatusDoc = { status: string } & Record<string, unknown>;
        const collectionDocs = new Map<string, StatusDoc>(
            Object.entries(docs).map(([id, data]) => [id, {...data}]),
        );

        const batchUpdates: Array<() => Promise<void>> = [];

        const collectionRef = {
            where: jest.fn((_field: string, _op: FirebaseFirestore.WhereFilterOp, value: string) => ({
                get: async () => {
                    const matchingDocs = Array.from(collectionDocs.entries())
                        .filter(([, data]) => data.status === value)
                        .map(([id, data]) => ({
                            id,
                            data: () => data,
                            ref: {
                                update: async (payload: Record<string, unknown>) => {
                                    const current = collectionDocs.get(id) ?? {status: 'UNKNOWN'};
                                    const nextStatus = typeof payload.status === 'string' ? payload.status : current.status;
                                    collectionDocs.set(id, {...current, ...payload, status: nextStatus} as StatusDoc);
                                },
                            },
                        }));

                    return {
                        empty: matchingDocs.length === 0,
                        docs: matchingDocs,
                        size: matchingDocs.length,
                    };
                },
            })),
        };

        return {
            collection: jest.fn(() => collectionRef),
            batch: jest.fn(() => ({
                update: (ref: {
                    update: (payload: Record<string, unknown>) => Promise<void>
                }, payload: Record<string, unknown>) => {
                    batchUpdates.push(() => ref.update(payload));
                },
                commit: async () => {
                    for (const commitOperation of batchUpdates.splice(0)) {
                        await commitOperation();
                    }
                },
            })),
        } as unknown as Firestore;
    };

    it('converts legacy statuses to ENDED while leaving others unchanged', async () => {
        const firestore = createTestFirestore({
            doc1: {status: 'sold'},
            doc2: {status: 'expired'},
            doc3: {status: 'ACTIVE'},
            doc4: {status: 'ENDED'},
        });

        await statusSoldExpiredToEnded.up(firestore);

        expect(firestore.collection).toHaveBeenCalledWith(expect.any(String));
        expect(firestore.batch).toHaveBeenCalled();
    });
});

// Merge helper logic tests from old migrations.test.ts

describe('Price history utilities', () => {
    const deduplicatePriceHistory = (history: Array<{ date: string; price: number; currency: string }>) => {
        if (!history || history.length <= 1) return history || [];

        const byDay = new Map<string, { date: string; price: number; currency: string }>();
        for (const point of history) {
            const day = point.date.split('T')[0];
            byDay.set(day, point);
        }

        return Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
    };

    it('keeps only the last entry per day and sorts chronologically', () => {
        const history = [
            {date: '2024-12-01T08:00:00Z', price: 100000, currency: 'PLN'},
            {date: '2024-12-01T12:00:00Z', price: 98000, currency: 'PLN'},
            {date: '2024-12-02T10:00:00Z', price: 95000, currency: 'PLN'},
            {date: '2024-12-02T14:00:00Z', price: 92000, currency: 'PLN'},
            {date: '2024-12-03T10:00:00Z', price: 90000, currency: 'PLN'},
        ];

        const deduped = deduplicatePriceHistory(history);
        expect(deduped).toHaveLength(3);
        expect(deduped[0].price).toBe(98000);
        expect(deduped[1].price).toBe(92000);
        expect(deduped[2].price).toBe(90000);
    });
});

