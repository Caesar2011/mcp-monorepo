import eslint from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import eslintPluginImport from 'eslint-plugin-import'
import eslintPluginUnusedImports from 'eslint-plugin-unused-imports'
import tseslint from 'typescript-eslint'

import { useLoggerNotConsolePlugin } from './.eslint/use-logger-not-console.mjs'

export default tseslint.config(
  {
    // Ignores specified directories from linting.
    ignores: ['**/node_modules', '**/dist', '**/out'],
  },
  // Recommended ESLint configurations for TypeScript.
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    // Configure resolver to use the TypeScript configuration.
    settings: {
      'import/resolver': {
        typescript: {
          project: [
            './tsconfig.json',
            //'./packages/*/tsconfig.json'
          ],
        },
      },
    },
  },
  {
    plugins: {
      import: eslintPluginImport,
      'unused-imports': eslintPluginUnusedImports,
      'use-logger-not-console': useLoggerNotConsolePlugin,
    },
    rules: {
      // --- Custom Rules
      'use-logger-not-console/replace-console-with-logger': 'error',
      // --- TypeScript Specific Rules ---

      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],

      '@typescript-eslint/no-unused-vars': 'off',

      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': 'allow-with-description',
          'ts-nocheck': true,
          'ts-check': true,
        },
      ],

      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',

      '@typescript-eslint/explicit-function-return-type': 'off',

      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=null]',
          message: 'Prefer `undefined` over `null` for absent values.',
        },
      ],

      // --- Import Specific Rules ---

      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling'], 'index', 'object', 'type'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-relative-parent-imports': 'off',
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: true,
          optionalDependencies: false,
          peerDependencies: false,
        },
      ],
      'import/no-unresolved': 'error',
      'import/extensions': 'off',
    },
  },
  eslintConfigPrettier,
)
