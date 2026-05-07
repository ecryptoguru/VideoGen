/**
 * In-memory SQLite database helper for integration tests.
 * Creates a fresh DB per test file to avoid state leakage.
 */
import Database from "better-sqlite3";
import { runMigrations } from "@/data/migrate";

let testDb: Database.Database | null = null;

export function getTestDb(): Database.Database {
  if (!testDb) {
    testDb = new Database(":memory:");
    testDb.pragma("journal_mode = WAL");
    runMigrations(testDb);
  }
  return testDb;
}

export function resetTestDb(): Database.Database {
  if (testDb) {
    try {
      testDb.close();
    } catch {
      // ignore close errors
    }
  }
  testDb = new Database(":memory:");
  testDb.pragma("journal_mode = WAL");
  runMigrations(testDb);
  return testDb;
}
