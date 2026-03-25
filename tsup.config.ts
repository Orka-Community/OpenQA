import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      'cli/index': 'cli/index.ts'
    },
    format: ['esm'],
    dts: false,
    sourcemap: false,
    clean: true,
    splitting: false,
    shims: true
  },
  {
    entry: {
      'agent/index': 'agent/index.ts',
      'database/index': 'database/index.ts'
    },
    format: ['esm'],
    dts: false,
    sourcemap: true,
    splitting: false,
    shims: true
  }
]);
