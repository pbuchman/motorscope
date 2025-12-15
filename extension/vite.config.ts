import {defineConfig} from 'vite';
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
            if (fs.existsSync(templatePath)) {
                const template = fs.readFileSync(templatePath, 'utf-8');
                const manifest = template.replace('{{OAUTH_CLIENT_ID}}', OAUTH_CLIENT_IDS[env]);
                fs.writeFileSync(resolve(__dirname, 'dist', 'manifest.json'), manifest);
                console.log(`[build] Generated manifest.json for environment: ${env}`);
            } else {
                // Fallback: copy existing manifest.json
                const manifestPath = resolve(__dirname, 'manifest.json');
                if (fs.existsSync(manifestPath)) {
                    fs.copyFileSync(manifestPath, resolve(__dirname, 'dist', 'manifest.json'));
                }
            }

            // Copy other static files
            const staticFiles = ['metadata.json', 'icon.png'];
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

export default defineConfig(({mode}) => {
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
