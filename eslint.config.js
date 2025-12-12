import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
    {
        ignores: ['**/dist/', '**/node_modules/', '**/coverage/', '**/*.config.js', '**/*.config.ts'],
    },
    js.configs.recommended,
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parser: tsparser,
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                ...globals.es2021,
                ...globals.node,
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            'indent': ['error', 4, {
                'SwitchCase': 1,
                'ignoredNodes': ['ConditionalExpression'],
            }],
            'quotes': ['error', 'single', {'avoidEscape': true}],
            'semi': ['error', 'always'],
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['error', {
                'argsIgnorePattern': '^_',
                'varsIgnorePattern': '^_',
            }],
            'object-curly-spacing': ['error', 'never'],
            'array-bracket-spacing': ['error', 'never'],
            'comma-dangle': ['error', 'always-multiline'],
            'no-trailing-spaces': 'error',
            'eol-last': ['error', 'always'],
            '@typescript-eslint/ban-ts-comment': 'off',
        },
    },
    {
        files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**/*', '**/test-utils/**/*', '**/__mocks__/**/*'],
        languageOptions: {
            globals: {
                ...globals.jest,
            },
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/ban-types': 'off',
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
    {
        files: ['**/*.d.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
];
