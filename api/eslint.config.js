import baseConfig from '../eslint.config.js';

export default [
    ...baseConfig,
    {
        languageOptions: {
            globals: {
                NodeJS: 'readonly',
                FirebaseFirestore: 'readonly',
            },
        },
        rules: {
            '@typescript-eslint/no-namespace': 'off',
        },
    },
    {
        files: ['**/*.test.ts', '**/__tests__/**/*'],
        rules: {
            '@typescript-eslint/no-unsafe-function-type': 'off',
            '@typescript-eslint/no-unused-vars': ['error', {
                'argsIgnorePattern': '^_',
                'varsIgnorePattern': '^_|^finished$',
            }],
        },
    },
];
