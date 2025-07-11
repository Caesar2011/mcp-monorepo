import { existsSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

import Database from 'better-sqlite3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function findClosestPackageJsonDir(startDir: string): string | undefined {
  let dir = resolve(startDir)
  while (true) {
    if (existsSync(join(dir, 'package.json'))) {
      return dir
    }
    const parent = dirname(dir)
    if (parent === dir) break // Reached root
    dir = parent
  }
  return undefined
}

// Database setup - singleton pattern
let dbInstance: Database.Database | undefined

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    const dbDir = findClosestPackageJsonDir(__dirname) || __dirname
    const dbPath = join(dbDir, 'memories.db')
    dbInstance = new Database(dbPath)

    // Initialize database schema
    dbInstance.exec(`
 CREATE TABLE IF NOT EXISTS memories (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 content TEXT NOT NULL,
 category TEXT,
 storage_type TEXT NOT NULL CHECK (storage_type IN ('short_term', 'mid_term', 'long_term')),
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 invalid_after INTEGER,
 created_timestamp INTEGER NOT NULL
 )`)
  }
  return dbInstance
}
