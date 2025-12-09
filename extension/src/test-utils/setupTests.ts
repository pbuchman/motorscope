/**
 * Jest Setup File
 *
 * Configures the test environment with necessary polyfills, mocks, and extensions.
 * This file runs after the test framework is installed in the environment.
 */

import '@testing-library/jest-dom';
import { setupChromeMock, resetChromeMock } from './chromeMock';

// Setup Chrome mock globally for all tests
setupChromeMock();

// Reset mocks before each test
beforeEach(() => {
  resetChromeMock();
  jest.clearAllMocks();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  root: null,
  rootMargin: '',
  thresholds: [],
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(),
}));

// Suppress console.error for act() warnings during tests
const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Warning:')) {
    return;
  }
  originalError.call(console, ...args);
};

