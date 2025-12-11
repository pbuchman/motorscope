/**
 * Jest Setup File
 *
 * Configures the test environment with necessary polyfills, mocks, and extensions.
 * This file runs after the test framework is installed in the environment.
 */

import React from 'react';
import '@testing-library/jest-dom';
import {resetChromeMock, setupChromeMock} from './chromeMock';

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

// Provide stable dimensions for Recharts ResponsiveContainer to avoid width/height warnings
jest.mock('recharts', () => {
    const actual = jest.requireActual<typeof import('recharts')>('recharts');
    return {
        ...actual,
        ResponsiveContainer: ({width = 800, height = 400, children}: {
            width?: number | string;
            height?: number | string;
            children: React.ReactNode | ((size: { width: number; height: number }) => React.ReactNode);
        }) => {
            const resolvedWidth = typeof width === 'number' ? width : 800;
            const resolvedHeight = typeof height === 'number' ? height : 400;
            const content =
                typeof children === 'function'
                    ? (children as (size: { width: number; height: number }) => React.ReactNode)({
                        width: resolvedWidth,
                        height: resolvedHeight
                    })
                    : children;

            return React.createElement(
                'div',
                {style: {width: resolvedWidth, height: resolvedHeight}},
                content,
            );
        },
    };
});
