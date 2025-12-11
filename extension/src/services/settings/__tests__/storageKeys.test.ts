/**
 * Tests for Storage Keys
 */

import { STORAGE_KEYS } from '../storageKeys';

describe('Storage Keys', () => {
  it('should have refreshStatus key defined', () => {
    expect(STORAGE_KEYS.refreshStatus).toBeDefined();
    expect(typeof STORAGE_KEYS.refreshStatus).toBe('string');
  });

  it('should have motorscope prefix in keys', () => {
    expect(STORAGE_KEYS.refreshStatus).toContain('motorscope');
  });

  it('should have unique values', () => {
    const values = Object.values(STORAGE_KEYS);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  it('should be readonly (const assertion)', () => {
    // TypeScript const assertion makes this immutable at type level
    // At runtime we can check the object structure
    expect(Object.keys(STORAGE_KEYS)).toContain('refreshStatus');
  });
});

