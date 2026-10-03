import { defineConfig } from 'eslint/config'
import tseslint from '@electron-toolkit/eslint-config-ts'
import { configs as tsConfigs } from 'typescript-eslint'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import eslintPluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

// Layer boundaries (see architecture): renderer ↔ main only via preload/IPC,
// only repositories/ and db/ touch Drizzle and the schema.
const drizzleValueImports = {
  group: ['drizzle-orm', 'drizzle-orm/*', 'better-sqlite3', '**/db/schema', '**/db/schema/**'],
  allowTypeImports: true,
  message: 'Only repositories/ and db/ may query the database. Type imports are fine.'
}

export default defineConfig(
  { ignores: ['**/node_modules', '**/dist', '**/out'] },
  tseslint.configs.recommendedTypeChecked,
  eslintPluginVue.configs['flat/recommended'],
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.web.json'],
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue']
      }
    }
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        },
        extraFileExtensions: ['.vue'],
        parser: tseslint.parser
      }
    }
  },
  {
    files: ['**/*.{ts,mts,tsx,vue}'],
    rules: {
      'vue/require-default-prop': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/block-lang': [
        'error',
        {
          script: {
            lang: 'ts'
          }
        }
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='transaction'] > :function[async=true]",
          message: 'better-sqlite3 transactions are synchronous — no async callback.'
        }
      ]
    }
  },
  {
    files: ['src/renderer/**/*.{ts,vue}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['electron', 'node:*', 'fs', 'path', 'os', 'child_process'],
              message: 'The renderer has no Node/Electron access — go through window.api.'
            },
            {
              group: [
                'drizzle-orm',
                'drizzle-orm/*',
                'better-sqlite3',
                '**/main/**',
                '**/preload/**'
              ],
              message: 'The renderer may only import from src/shared.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['electron', '**/main/**', '**/renderer/**', '**/preload/**'],
              message: 'src/shared must not depend on any process-specific code.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/main/**/*.ts'],
    ignores: [
      'src/main/repositories/**',
      'src/main/db/**',
      'src/main/services/**',
      'src/main/ipc/**'
    ],
    rules: {
      'no-restricted-imports': ['error', { patterns: [drizzleValueImports] }]
    }
  },
  {
    files: ['src/main/services/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            drizzleValueImports,
            {
              group: ['electron', '**/ipc/**'],
              message: 'Services are framework-free — no Electron or IPC imports.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/main/ipc/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            drizzleValueImports,
            {
              group: ['**/repositories/**'],
              message: 'IPC handlers call services, never repositories.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tsConfigs.disableTypeChecked
  },
  eslintConfigPrettier
)
