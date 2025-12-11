// Jest setup file for ESM compatibility
// This file ensures Jest globals are available

import {jest} from '@jest/globals';

// Re-export to make available globally
globalThis.jest = jest;

