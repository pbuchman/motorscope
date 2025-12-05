import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

// Simple plugin to copy manifest and background.js to dist
const copyExtensionFiles = () => {
  return {
    name: 'copy-extension-files',
    closeBundle: () => {
      const filesToCopy = ['manifest.json', 'background.js', 'metadata.json', 'icon.png'];
      filesToCopy.forEach(file => {
        if (fs.existsSync(file)) {
          fs.copyFileSync(file, resolve(__dirname, 'dist', file));
        }
      });
    }
  };
};

export default defineConfig({
  plugins: [react(), copyExtensionFiles()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
});