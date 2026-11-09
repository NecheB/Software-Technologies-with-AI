import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({ build: { rollupOptions: { input: Object.fromEntries(['index','directory','business','signin','register','account'].map(name => [name, resolve(import.meta.dirname, `${name}.html`)])) } } });
