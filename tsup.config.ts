import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      'cli/index': 'cli/index.ts'
    },
    format: ['esm'],
    dts: false,  // Désactiver DTS pour éviter les erreurs de types complexes
    sourcemap: true,
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
    dts: false,  // Désactiver DTS pour éviter les erreurs de types complexes
    sourcemap: true,
    splitting: false,
    shims: true
  }
]);
