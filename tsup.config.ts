import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      'cli/index': 'cli/index.ts'
    },
    format: ['cjs'],  // Utiliser CJS pour le binaire avec shebang
    dts: false,
    sourcemap: false,  // Pas besoin de sourcemap pour le binaire
    clean: true,
    splitting: false,
    shims: true,
    banner: {
      js: '#!/usr/bin/env node'
    }
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
