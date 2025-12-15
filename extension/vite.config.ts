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
const MANIFEST_KEYS: Record<Environment, string> = {
    // Dev key - generates extension ID for dev OAuth client
    dev: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvjTpR0Us75uREbD+W90RIhFHnhBE1j0U2W+ry9YZYEs5ESQF++kOEpbq8KQxwUUkPVr/7Y7NjLEjnqCEkjunwgrnToYEAjZy3REhfn0hCB6Ia2fIaeEqLVaXKgK9A7m8pvdvLxxsJNZ5ylHmi92LN6XHsa44oNcx7EqBie6rxoqowaxttsAUUFLhLwyM5olh9g4k71Ykh0QwQ/wNHUQ7VZnROchbvvbtQpwhsxzpOXoUbs/SxIfUAXiaNQoFW7kXUI9gyQ9MDevE+Ge0oMz1IcjNT1Jw1vJpePaUVsUV880SxWuNqtG9cPK29xl1RkPXrkJY1ws66kHZDm9S6du93QIDAQAB',
    // Prod key - generates extension ID for prod OAuth client
    prod: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAw8mK3rULXH5pZ5KqfGQvXMgYo0j8C2vPh4ZB3VZxk7W9sT6RMfH1qNpLcJ5dKz0YA8tB2v3oXwK9pR5nM4L6hQ1sF7jE8cD2iN0bG9yU4mA3xW5vT1qP6oL8sK2dJ0fR4tC7zA9uH3bQ1xS2wE4pN6mD5qK0vT8rC1fZ3yJ2aG7hI9nL4oP5sQ6tU0vW1xY2zA3bB4cC5dD6eE7fF8gG9hH0iI1jJ2kK3lL4mM5nN6oO7pP8qQ9rR0sS1tT2uU3vV4wW5xX6yY7zZ8aA9bB0cC1dD2eE3fF4gG5hH6iI7jJ8kK9lL0mM1nN2oO3pP4qQ5rR6sS7tT8uU9vVwQIDAQAB',
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
