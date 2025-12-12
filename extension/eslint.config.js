import baseConfig from '../eslint.config.js';
import globals from 'globals';

export default [
    ...baseConfig,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                chrome: 'readonly',
                RequestInit: 'readonly',
                NodeJS: 'readonly',
            },
        },
    },
];
