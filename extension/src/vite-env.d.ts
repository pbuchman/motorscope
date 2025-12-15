/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_ENV: 'dev' | 'prod';
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

