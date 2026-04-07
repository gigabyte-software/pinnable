import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'Pinnable',
      formats: ['es', 'umd'],
      fileName: (format) => `pinnable.${format === 'es' ? 'es' : 'umd'}.js`,
    },
  },
});
