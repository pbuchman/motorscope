import {defineConfig} from 'vite';
// @ts-ignore - types exist but moduleResolution setting doesn't find them
import react from '@vitejs/plugin-react';
import {resolve} from 'path';
// @ts-ignore
import fs from 'fs';

// Declare process.env types for Node environment
declare const process: {
    env: {
        VITE_ENV?: string;
    };
};

// Environment configuration
type Environment = 'dev' | 'prod';

// OAuth Client IDs per environment
const OAUTH_CLIENT_IDS: Record<Environment, string> = {
    dev: '608235183788-siuni6ukq90iou35afhukfc02b7sa8la.apps.googleusercontent.com',
    prod: '83225257608-86kc32r143q96ghn1gmq8c5rhoqcu4jc.apps.googleusercontent.com',
};

// Manifest keys per environment (for consistent extension ID)
// Generated using: openssl genrsa -out key.pem 2048 && openssl rsa -in key.pem -pubout -outform DER | base64
// Keys stored in extension/keys/ directory
const MANIFEST_KEYS: Record<Environment, string> = {
    dev: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxDBhPYKCaLNu0UpqFZ2RbToHpDk2xfGd42/qeaUfgm4Qgdo04gMW9dmiV6kc/OuQ04cRCO7EpYWwFkJwsaB9GT9ZVpNGNbDXc3RkxIjdYMMd5ZB6hZRM9jO8uJlhJO73qCvKjYT8Y56NnbF6eRVAIcDpacWwM18UCUcTnQRr7yAEU2DOkUcs9DipfguJL5nKi41Q4CjI5i6OaONvMUry39uVue5XlXykrEGoODiMJLbwUeiZKoe0isQkORhiNi5ThLCr50r8EbGHc1x7kLweCvcixaLhkk2TZNkfVaXWQj4JPkYV2llMM0WgAEXoLIjy/CSHq19eiFkazeGJL2oLdQIDAQAB',
    prod: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuoUtTHyTZIO+lR+rE3KT7iyhGmChojGrNciiqoCfn9ogQeOGkPjz8DE9BwihKeSxbEoOyPH9ORfKadtacIy+J2i7uBCFEF4+VQJaSow7SRMS6tfQkIMF9LEwlJLo1EnH1CDjVooK+9ino2adjfRtu678a/Se1Q59kAPbGgJXeykvHR3PY6sS04x2GvlOxMVBnP2yI+5AxX7CNBA9Qz7e4a9ooX9U2Z6PQBApJPWVce3qB0UUGVfEkfjn3/oSCD4R0UAPhgwlUhz2aGzfEJ4iEXzPFwxPImnQz33q459a8M46Fvq4o7t3OlfMAsIApnKLp/JlI9eZu8otoqvVqqRueQIDAQAB',
};

// Icon files per environment
const ICON_FILES: Record<Environment, string> = {
    dev: 'icon-dev.png',
    prod: 'icon-prod.png',
};

// Get environment from VITE_ENV or default to 'dev'
const getEnv = (): Environment => {
    const env = process.env.VITE_ENV as Environment | undefined;
    if (env && (env === 'dev' || env === 'prod')) {
        return env;
    }
    return 'dev';
};

// Plugin to generate manifest and copy static files
const copyExtensionFiles = (env: Environment) => {
    return {
        name: 'copy-extension-files',
        closeBundle: () => {
            // Generate manifest from template
            const templatePath = resolve(__dirname, 'manifest.template.json');
            if (!fs.existsSync(templatePath)) {
                throw new Error('manifest.template.json not found');
            }
            let template = fs.readFileSync(templatePath, 'utf-8');
            template = template.replace('{{OAUTH_CLIENT_ID}}', OAUTH_CLIENT_IDS[env]);
            template = template.replace('{{MANIFEST_KEY}}', MANIFEST_KEYS[env]);
            fs.writeFileSync(resolve(__dirname, 'dist', 'manifest.json'), template);
            console.log(`[build] Generated manifest.json for environment: ${env}`);

            // Copy environment-specific icon as icon.png
            const iconSrc = resolve(__dirname, ICON_FILES[env]);
            const iconDest = resolve(__dirname, 'dist', 'icon.png');
            if (fs.existsSync(iconSrc)) {
                fs.copyFileSync(iconSrc, iconDest);
                console.log(`[build] Copied ${ICON_FILES[env]} as icon.png`);
            } else {
                throw new Error(`Icon file not found: ${ICON_FILES[env]}`);
            }

            // Copy other static files
            const staticFiles = ['metadata.json'];
            staticFiles.forEach(file => {
                const srcPath = resolve(__dirname, file);
                if (fs.existsSync(srcPath)) {
                    fs.copyFileSync(srcPath, resolve(__dirname, 'dist', file));
                }
            });

            // Ensure content-scripts directory exists in dist
            const contentScriptsDir = resolve(__dirname, 'dist', 'content-scripts');
            if (!fs.existsSync(contentScriptsDir)) {
                fs.mkdirSync(contentScriptsDir, {recursive: true});
            }
        }
    };
};

export default defineConfig(() => {
    const env = getEnv();
    console.log(`[vite] Building for environment: ${env}`);

    return {
        plugins: [react(), copyExtensionFiles(env)],
        base: './',
        define: {
            'import.meta.env.VITE_ENV': JSON.stringify(env),
        },
        resolve: {
            alias: {
                '@': resolve(__dirname, 'src'),
            },
        },
        build: {
            outDir: 'dist',
            emptyOutDir: true,
            rollupOptions: {
                input: {
                    main: resolve(__dirname, 'index.html'),
                    background: resolve(__dirname, 'src/background.ts'),
                    'content-scripts/otomoto': resolve(__dirname, 'src/content-scripts/otomoto-main.ts'),
                    'content-scripts/otomoto-listing': resolve(__dirname, 'src/content-scripts/otomoto-listing.ts'),
                },
                output: {
                    entryFileNames: (chunkInfo) => {
                        // Keep background.js as a flat file name for the service worker
                        if (chunkInfo.name === 'background') {
                            return 'background.js';
                        }
                        // Content scripts go in content-scripts folder
                        if (chunkInfo.name.startsWith('content-scripts/')) {
                            return `${chunkInfo.name}.js`;
                        }
                        return 'assets/[name]-[hash].js';
                    },
                },
            },
        },
    };
});
