import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

const alias = { '@shared': resolve('src/shared') }

export default defineConfig({
  test: {
    projects: [
      {
        // Runs inside Electron's Node (ELECTRON_RUN_AS_NODE): better-sqlite3 is built for its ABI.
        resolve: { alias },
        test: {
          name: 'main',
          environment: 'node',
          pool: 'forks',
          include: ['src/main/**/*.test.ts', 'src/shared/**/*.test.ts']
        }
      },
      {
        // Renderer logic kept free of Vue and the DOM runs in plain Node. Add happy-dom and
        // @vue/test-utils here when a component itself needs a test.
        resolve: { alias },
        test: {
          name: 'renderer',
          environment: 'node',
          include: ['src/renderer/**/*.test.ts']
        }
      }
    ]
  }
})
