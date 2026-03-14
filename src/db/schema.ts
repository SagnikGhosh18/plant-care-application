import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('plant_id.db');
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  const database = getDatabase();

  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS plants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      scientific_name TEXT NOT NULL,
      photo_path TEXT NOT NULL,
      watering_schedule TEXT NOT NULL,
      light_requirements TEXT NOT NULL,
      fertilizer_guidance TEXT NOT NULL,
      common_problems TEXT NOT NULL DEFAULT '[]',
      last_watered_at INTEGER,
      last_fertilized_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      plant_id TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('water', 'fertilize', 'repot', 'rotate')),
      scheduled_at INTEGER NOT NULL,
      completed_at INTEGER,
      notification_id TEXT,
      created_at INTEGER NOT NULL
    );
  `);
}
