import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'path';
// @ts-ignore
import fs from 'fs';

// Simple plugin to copy manifest and static files to dist
const copyExtensionFiles = () => {
    return {
        name: 'copy-extension-files',
        closeBundle: () => {
            const filesToCopy = ['manifest.json', 'metadata.json', 'icon.png'];
            filesToCopy.forEach(file => {
                const srcPath = resolve(__dirname, file);
                if (fs.existsSync(srcPath)) {
                    fs.copyFileSync(srcPath, resolve(__dirname, 'dist', file));
                }
            });

            // Ensure content-scripts directory exists in dist
            const contentScriptsDir = resolve(__dirname, 'dist', 'content-scripts');
            if (!fs.existsSync(contentScriptsDir)) {
                fs.mkdirSync(contentScriptsDir, { recursive: true });
            }
        }
    };
};

export default defineConfig({
    plugins: [react(), copyExtensionFiles()],
    base: './',
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
});
