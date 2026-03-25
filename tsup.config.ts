import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'cli/index': 'cli/index.ts',
    'agent/index': 'agent/index.ts',
    'database/index': 'database/index.ts'
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  shims: true,
  banner: {
    js: '#!/usr/bin/env node'
  }
});
