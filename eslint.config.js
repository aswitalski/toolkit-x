import js from '@eslint/js'
import prettier from 'eslint-config-prettier/flat'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const unusedVars = ['error', { vars: 'local', args: 'none' }]

export default defineConfig([
  {
    ignores: ['dist', 'coverage', '.vitest'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'no-constant-condition': ['error', { checkLoops: false }],
      curly: 'error',
      eqeqeq: 'error',
      'no-console': ['error', { allow: ['assert', 'error', 'warn'] }],
      'no-else-return': 'error',
      'no-extra-boolean-cast': 'off',
      'no-fallthrough': 'error',
      'no-invalid-this': 'error',
      'no-undef': 'off',
      'no-unused-vars': unusedVars,
      'new-cap': ['error', { capIsNew: false }],
      'no-unneeded-ternary': 'error',
      'arrow-body-style': ['error', 'as-needed'],
      'no-useless-computed-key': 'error',
      'no-useless-constructor': 'error',
      'no-var': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
    },
  },
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': unusedVars,
      // async marks Promise-returning APIs, even without an await
      '@typescript-eslint/require-await': 'off',
    },
  },
  {
    files: ['*.js', 'demo/vite.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
  prettier,
])
