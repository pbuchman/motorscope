/**
 * Tests for i18n Configuration
 *
 * Tests that internationalization is properly configured
 * and all translation files are complete.
 */

// Mock i18next and react-i18next before importing
jest.mock('i18next', () => ({
  use: jest.fn().mockReturnThis(),
  init: jest.fn().mockReturnThis(),
  t: jest.fn((key: string) => key),
  language: 'en',
  changeLanguage: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  initReactI18next: { type: 'backend' },
  useTranslation: () => ({
    t: jest.fn((key: string) => key),
    i18n: {
      language: 'en',
      changeLanguage: jest.fn(),
    },
  }),
}));

// Import translation files directly
import commonEn from '../locales/en/common.json';
import dashboardEn from '../locales/en/dashboard.json';
import popupEn from '../locales/en/popup.json';
import settingsEn from '../locales/en/settings.json';
import listingEn from '../locales/en/listing.json';
import authEn from '../locales/en/auth.json';
import errorsEn from '../locales/en/errors.json';

import commonPl from '../locales/pl/common.json';
import dashboardPl from '../locales/pl/dashboard.json';
import popupPl from '../locales/pl/popup.json';
import settingsPl from '../locales/pl/settings.json';
import listingPl from '../locales/pl/listing.json';
import authPl from '../locales/pl/auth.json';
import errorsPl from '../locales/pl/errors.json';

describe('i18n Configuration', () => {
  describe('Translation Files Exist', () => {
    it('should have English translation files', () => {
      expect(commonEn).toBeDefined();
      expect(dashboardEn).toBeDefined();
      expect(popupEn).toBeDefined();
      expect(settingsEn).toBeDefined();
      expect(listingEn).toBeDefined();
      expect(authEn).toBeDefined();
      expect(errorsEn).toBeDefined();
    });

    it('should have Polish translation files', () => {
      expect(commonPl).toBeDefined();
      expect(dashboardPl).toBeDefined();
      expect(popupPl).toBeDefined();
      expect(settingsPl).toBeDefined();
      expect(listingPl).toBeDefined();
      expect(authPl).toBeDefined();
      expect(errorsPl).toBeDefined();
    });
  });

  describe('Translation Key Parity', () => {
    /**
     * Helper function to get all keys from an object recursively
     */
    const getAllKeys = (obj: Record<string, unknown>, prefix = ''): string[] => {
      const keys: string[] = [];
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys.sort();
    };

    /**
     * Filter out i18next plural suffixes for cross-language comparison
     * Polish uses _0, _1, _2 etc. for plural forms while English uses _plural
     */
    const filterPluralKeys = (keys: string[]): string[] => {
      return keys.filter(key => !/_\d+$/.test(key));
    };

    it('should have matching keys in common namespace (excluding plural variants)', () => {
      const enKeys = filterPluralKeys(getAllKeys(commonEn));
      const plKeys = filterPluralKeys(getAllKeys(commonPl));
      expect(enKeys).toEqual(plKeys);
    });

    it('should have matching keys in dashboard namespace (excluding plural variants)', () => {
      const enKeys = filterPluralKeys(getAllKeys(dashboardEn));
      const plKeys = filterPluralKeys(getAllKeys(dashboardPl));
      expect(enKeys).toEqual(plKeys);
    });

    it('should have matching keys in popup namespace (excluding plural variants)', () => {
      const enKeys = filterPluralKeys(getAllKeys(popupEn));
      const plKeys = filterPluralKeys(getAllKeys(popupPl));
      expect(enKeys).toEqual(plKeys);
    });

    it('should have matching keys in settings namespace (excluding plural variants)', () => {
      const enKeys = filterPluralKeys(getAllKeys(settingsEn));
      const plKeys = filterPluralKeys(getAllKeys(settingsPl));
      expect(enKeys).toEqual(plKeys);
    });

    it('should have matching keys in listing namespace (excluding plural variants)', () => {
      const enKeys = filterPluralKeys(getAllKeys(listingEn));
      const plKeys = filterPluralKeys(getAllKeys(listingPl));
      expect(enKeys).toEqual(plKeys);
    });

    it('should have matching keys in auth namespace (excluding plural variants)', () => {
      const enKeys = filterPluralKeys(getAllKeys(authEn));
      const plKeys = filterPluralKeys(getAllKeys(authPl));
      expect(enKeys).toEqual(plKeys);
    });

    it('should have matching keys in errors namespace (excluding plural variants)', () => {
      const enKeys = filterPluralKeys(getAllKeys(errorsEn));
      const plKeys = filterPluralKeys(getAllKeys(errorsPl));
      expect(enKeys).toEqual(plKeys);
    });
  });

  describe('Translation Values', () => {
    /**
     * Helper to check if all leaf values are non-empty strings
     */
    const hasNoEmptyValues = (obj: Record<string, unknown>, path = ''): string[] => {
      const emptyPaths: string[] = [];
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          emptyPaths.push(...hasNoEmptyValues(value as Record<string, unknown>, currentPath));
        } else if (typeof value === 'string' && value.trim() === '') {
          emptyPaths.push(currentPath);
        }
      }
      return emptyPaths;
    };

    it('should have no empty English translations', () => {
      const allEn = {
        common: commonEn,
        dashboard: dashboardEn,
        popup: popupEn,
        settings: settingsEn,
        listing: listingEn,
        auth: authEn,
        errors: errorsEn,
      };
      const emptyPaths = hasNoEmptyValues(allEn);
      expect(emptyPaths).toEqual([]);
    });

    it('should have no empty Polish translations', () => {
      const allPl = {
        common: commonPl,
        dashboard: dashboardPl,
        popup: popupPl,
        settings: settingsPl,
        listing: listingPl,
        auth: authPl,
        errors: errorsPl,
      };
      const emptyPaths = hasNoEmptyValues(allPl);
      expect(emptyPaths).toEqual([]);
    });
  });

  describe('Required Keys', () => {
    it('should have app name in common namespace', () => {
      expect(commonEn).toHaveProperty('appName');
      expect(commonPl).toHaveProperty('appName');
    });

    it('should have loading state in common namespace', () => {
      expect(commonEn).toHaveProperty('loading');
      expect(commonPl).toHaveProperty('loading');
    });

    it('should have auth-related translations', () => {
      expect(authEn).toHaveProperty('signIn');
      expect(authEn).toHaveProperty('signOut');
      expect(authPl).toHaveProperty('signIn');
      expect(authPl).toHaveProperty('signOut');
    });
  });

  describe('Interpolation Patterns', () => {
    /**
     * Extract interpolation variables from translation strings
     * Format: {{variableName}}
     */
    const extractVariables = (str: string): string[] => {
      const matches = str.match(/\{\{(\w+)}}/g) || [];
      return matches.map(m => m.replace(/[{}]/g, '')).sort();
    };

    const checkInterpolation = (
      en: Record<string, unknown>,
      pl: Record<string, unknown>,
      path = ''
    ): string[] => {
      const mismatches: string[] = [];

      for (const key of Object.keys(en)) {
        const currentPath = path ? `${path}.${key}` : key;
        const enVal = en[key];
        const plVal = pl[key];

        if (typeof enVal === 'string' && typeof plVal === 'string') {
          const enVars = extractVariables(enVal);
          const plVars = extractVariables(plVal);

          if (JSON.stringify(enVars) !== JSON.stringify(plVars)) {
            mismatches.push(`${currentPath}: EN has ${enVars}, PL has ${plVars}`);
          }
        } else if (
          typeof enVal === 'object' &&
          enVal !== null &&
          typeof plVal === 'object' &&
          plVal !== null
        ) {
          mismatches.push(
            ...checkInterpolation(
              enVal as Record<string, unknown>,
              plVal as Record<string, unknown>,
              currentPath
            )
          );
        }
      }

      return mismatches;
    };

    it('should have matching interpolation variables in all namespaces', () => {
      const mismatches = [
        ...checkInterpolation(commonEn, commonPl, 'common'),
        ...checkInterpolation(dashboardEn, dashboardPl, 'dashboard'),
        ...checkInterpolation(popupEn, popupPl, 'popup'),
        ...checkInterpolation(settingsEn, settingsPl, 'settings'),
        ...checkInterpolation(listingEn, listingPl, 'listing'),
        ...checkInterpolation(authEn, authPl, 'auth'),
        ...checkInterpolation(errorsEn, errorsPl, 'errors'),
      ];

      expect(mismatches).toEqual([]);
    });
  });
});

