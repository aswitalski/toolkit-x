import fs from 'node:fs'
import { defineConfig } from 'tsdown'

const { version } = JSON.parse(fs.readFileSync('package.json', 'utf8'))

const loader = fs.readFileSync(
  'node_modules/lazy-module-loader/loader.js',
  'utf8',
)

export default defineConfig([
  {
    // ES module with type declarations, the package entry
    entry: { index: 'src/index.ts' },
    format: 'esm',
    platform: 'browser',
    target: 'es2024',
    sourcemap: true,
    // declaration maps lead editors to the TypeScript sources
    dts: { sourcemap: true },
    publint: true,
    attw: { profile: 'esm-only' },
  },
  {
    // Classic script exposing the loader and opr.Toolkit globals
    entry: { [`toolkit-${version}`]: 'src/release.ts' },
    format: 'iife',
    platform: 'browser',
    target: 'es2024',
    sourcemap: true,
    dts: false,
    clean: false,
    hash: false,
    banner: { js: loader },
    outputOptions: { entryFileNames: '[name].js' },
  },
])
