import { defineConfig } from 'tsup'

export default defineConfig([
  // Library build
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'node20',
    outDir: 'dist',
    outExtension({ format }) {
      return { js: format === 'cjs' ? '.cjs' : '.mjs' }
    },
  },
  // CLI build
  {
    entry: { cli: 'src/cli.ts' },
    format: ['esm', 'cjs'],
    dts: false,
    sourcemap: true,
    clean: false,
    target: 'node20',
    outDir: 'dist',
    banner: {
      js: '#!/usr/bin/env node',
    },
    outExtension({ format }) {
      return { js: format === 'cjs' ? '.cjs' : '.mjs' }
    },
  },
])
