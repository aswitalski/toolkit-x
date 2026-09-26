import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const { version } = JSON.parse(
  fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
)

const resolve = path => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      toolkit: resolve(
        mode === 'release'
          ? `../dist/toolkit-${version}.esm.js`
          : '../src/index.ts',
      ),
    },
  },
}))
