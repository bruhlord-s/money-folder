import { defineConfig } from 'drizzle-kit'

// Only used for `generate` / `check`. Migrations are applied by the app on startup.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/main/db/schema/index.ts',
  out: './src/main/db/migrations'
})
