import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.spec.js', 'test/functional/**/*.test.js'],
    setupFiles: ['test/setup.js'],
    globals: true,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
    },
  },
})
