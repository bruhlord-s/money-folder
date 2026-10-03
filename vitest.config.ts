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
      }
    ]
  }
})
