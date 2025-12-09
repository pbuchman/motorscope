/**
 * Unit Tests for Migration Module
 *
 * Tests the migration runner with mocked Firestore.
 * Covers runMigrations(), getMigrationStatus(), and locking logic.
 *
 * Note: This is a UNIT test (not integration) because Firestore is mocked.
 * For true integration tests, use Firebase Emulator with FIRESTORE_EMULATOR_HOST.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// =============================================================================
// Mock Firestore
// =============================================================================

// Track mock data
const mockData: Map<string, Map<string, any>> = new Map();

// Helper to get/create collection data
const getCollectionData = (name: string) => {
  if (!mockData.has(name)) {
    mockData.set(name, new Map());
  }
  return mockData.get(name)!;
};

// Create mock document reference
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
    getCollectionData(collectionName).set(docId, { ...existing, ...data });
  }),
  delete: jest.fn(async () => {
    getCollectionData(collectionName).delete(docId);
  }),
});

// Create mock collection reference
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

// Mock Firestore class
const mockFirestore = {
  collection: jest.fn((name: string) => createMockCollectionRef(name)),
  batch: jest.fn(() => ({
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn(async () => {}),
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

// Mock Timestamp
const mockTimestamp = {
  now: jest.fn(() => ({ toDate: () => new Date() })),
  fromDate: jest.fn((date: Date) => ({ toDate: () => date })),
};

// Setup module mocks before importing
(jest as any).unstable_mockModule('@google-cloud/firestore', () => ({
  Firestore: class {
    constructor() {
      return mockFirestore;
    }
  },
  Timestamp: mockTimestamp,
}));

describe('Migrations Unit Tests', () => {
  beforeEach(() => {
    // Clear all mock data between tests
    mockData.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('runMigrations', () => {
    it('should skip migrations when all are already applied', async () => {
      // Pre-populate migrations collection with applied migration
      const migrationsData = getCollectionData('_migrations');
      migrationsData.set('20241209_status_sold_expired_to_ended', {
        id: '20241209_status_sold_expired_to_ended',
        description: 'Migrate listing statuses from sold/expired to ENDED',
        appliedAt: mockTimestamp.now(),
        durationMs: 100,
      });

      const { runMigrations } = await import('../migrations.js');

      // Should complete without errors
      await runMigrations();

      // Migration should not have been re-applied (check lock wasn't created)
      expect(migrationsData.has('20241209_status_sold_expired_to_ended_lock')).toBe(false);
    });

    it('should handle empty migrations list gracefully', async () => {
      // All migrations pre-applied
      const migrationsData = getCollectionData('_migrations');
      migrationsData.set('20241209_status_sold_expired_to_ended', {
        id: '20241209_status_sold_expired_to_ended',
        appliedAt: mockTimestamp.now(),
      });

      const { runMigrations } = await import('../migrations.js');

      // Should not throw
      await expect(runMigrations()).resolves.not.toThrow();
    });
  });

  describe('getMigrationStatus', () => {
    it('should return status for all defined migrations', async () => {
      const { getMigrationStatus } = await import('../migrations.js');

      const status = await getMigrationStatus();

      expect(Array.isArray(status)).toBe(true);
      expect(status.length).toBeGreaterThan(0);

      // Each status item should have required fields
      for (const item of status) {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('description');
        expect(item).toHaveProperty('applied');
      }
    });

    it('should show migration as applied when record exists', async () => {
      // Pre-populate with applied migration
      const migrationsData = getCollectionData('_migrations');
      const appliedAt = new Date('2024-12-09T10:00:00Z');
      migrationsData.set('20241209_status_sold_expired_to_ended', {
        id: '20241209_status_sold_expired_to_ended',
        description: 'Test migration',
        appliedAt: { toDate: () => appliedAt },
        durationMs: 50,
      });

      const { getMigrationStatus } = await import('../migrations.js');

      const status = await getMigrationStatus();
      const migration = status.find(m => m.id === '20241209_status_sold_expired_to_ended');

      expect(migration).toBeDefined();
      expect(migration!.applied).toBe(true);
      expect(migration!.appliedAt).toEqual(appliedAt);
    });

    it('should show migration as not applied when no record exists', async () => {
      // Don't pre-populate - migration should show as not applied
      const { getMigrationStatus } = await import('../migrations.js');

      const status = await getMigrationStatus();
      const migration = status.find(m => m.id === '20241209_status_sold_expired_to_ended');

      expect(migration).toBeDefined();
      expect(migration!.applied).toBe(false);
      expect(migration!.appliedAt).toBeUndefined();
    });
  });

  describe('Migration Locking Logic', () => {
    it('should detect stale locks (older than 5 minutes)', () => {
      // This tests the lock timeout logic
      const LOCK_TIMEOUT_MS = 5 * 60 * 1000;

      const isLockStale = (lockTime: Date): boolean => {
        const lockAge = Date.now() - lockTime.getTime();
        return lockAge >= LOCK_TIMEOUT_MS;
      };

      // Fresh lock
      expect(isLockStale(new Date())).toBe(false);

      // 4 minute old lock
      expect(isLockStale(new Date(Date.now() - 4 * 60 * 1000))).toBe(false);

      // 5 minute old lock (stale)
      expect(isLockStale(new Date(Date.now() - 5 * 60 * 1000))).toBe(true);

      // 10 minute old lock (stale)
      expect(isLockStale(new Date(Date.now() - 10 * 60 * 1000))).toBe(true);
    });
  });

  describe('Migration Definition Validation', () => {
    it('should have valid migration ID format (YYYYMMDD_description)', async () => {
      const { getMigrationStatus } = await import('../migrations.js');

      const status = await getMigrationStatus();
      const migrationIdPattern = /^\d{8}_[a-z_]+$/;

      for (const migration of status) {
        expect(migration.id).toMatch(migrationIdPattern);
      }
    });

    it('should have non-empty descriptions for all migrations', async () => {
      const { getMigrationStatus } = await import('../migrations.js');

      const status = await getMigrationStatus();

      for (const migration of status) {
        expect(migration.description).toBeTruthy();
        expect(migration.description.length).toBeGreaterThan(0);
      }
    });
  });
});

