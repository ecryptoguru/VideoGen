import Database from "better-sqlite3";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

export function runMigrations(db: Database.Database) {
  // Create migrations table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      migration_id TEXT UNIQUE NOT NULL,
      filename TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Get all migration files - use process.cwd() for proper path resolution in Next.js
  const migrationsDir = join(process.cwd(), "src", "data", "migrations");
  
  // Check if migrations directory exists
  if (!existsSync(migrationsDir)) {
    console.warn(`⚠️  Migrations directory not found at: ${migrationsDir}`);
    return;
  }

  const migrationFiles = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // Sort alphabetically to ensure order

  // Get applied migrations
  const appliedMigrations = db
    .prepare("SELECT migration_id FROM _migrations")
    .all() as { migration_id: string }[];
  const appliedIds = new Set(appliedMigrations.map((m) => m.migration_id));

  // Run pending migrations
  for (const file of migrationFiles) {
    const migrationId = file.replace(".sql", "");
    
    if (appliedIds.has(migrationId)) {
      continue; // Already applied
    }

    try {
      const sql = readFileSync(join(migrationsDir, file), "utf-8");
      
      // Run the migration in a transaction
      const transaction = db.transaction(() => {
        db.exec(sql);
        db.prepare(
          "INSERT INTO _migrations (migration_id, filename) VALUES (?, ?)"
        ).run(migrationId, file);
      });

      transaction();
      console.log(`✅ Applied migration: ${migrationId}`);
    } catch (error) {
      console.error(`❌ Failed to apply migration ${migrationId}:`, error);
      throw error;
    }
  }
}
