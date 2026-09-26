import js from '@eslint/js'
import prettier from 'eslint-config-prettier/flat'
import globals from 'globals'

export default [
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
      'no-unused-vars': ['error', { vars: 'local', args: 'none' }],
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
]
