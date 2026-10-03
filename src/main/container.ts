import { openDatabase, type Db } from './db/client'
import { runMigrations } from './db/migrate'

interface ContainerConfig {
  dbPath: string
  migrationsFolder: string
}

export interface Container {
  db: Db
  dispose: () => void
}

/** Composition root: the only place where dependencies are wired together. */
export function createContainer({ dbPath, migrationsFolder }: ContainerConfig): Container {
  const db = openDatabase(dbPath)
  try {
    runMigrations(db, migrationsFolder)
  } catch (error) {
    db.$client.close()
    throw error
  }

  return {
    db,
    dispose: () => db.$client.close()
  }
}
