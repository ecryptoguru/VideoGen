import Database from "better-sqlite3";
import { join } from "path";
import { runMigrations } from "./migrate";

const dbPath = process.env.DATABASE_URL?.replace("file:", "") || join(process.cwd(), "data", "video-gen.db");

let db: Database.Database | null = null;
let initialized = false;

function createDb(): Database.Database {
  try {
    const instance = new Database(dbPath);
    instance.pragma("journal_mode = WAL");
    return instance;
  } catch (error) {
    console.error("[DB] Failed to open database:", error);
    throw new Error(
      `Database connection failed at ${dbPath}. ` +
        "Ensure the directory exists and the process has write permissions."
    );
  }
}

export function initDb() {
  if (initialized && db) return;
  db = createDb();
  try {
    runMigrations(db);
    initialized = true;
  } catch (error) {
    console.error("[DB] Migration failed:", error);
    throw new Error("Database migration failed. Check migration files for syntax errors.");
  }
}

function getDb(): Database.Database {
  if (!initialized || !db) {
    initDb();
  }
  return db!;
}

// Lazy proxy so module-level imports don't trigger DB init immediately.
// This prevents crashes during test collection and serverless cold starts.
const lazyDb = new Proxy({} as Database.Database, {
  get(_target, prop) {
    const instance = getDb();
    const value = (instance as unknown as Record<string, unknown>)[prop as string];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

export default lazyDb;
