import { Platform } from 'react-native';

export interface OverrideRecord {
  id: number;
  timestamp: number; // Unix epoch ms
  context: string;
  action: string;
  isCorrection: boolean;
}

// In-memory fallback for web/unsupported environments
let fallbackStorage: OverrideRecord[] = [];

// Try to load expo-sqlite if we're on native
let db: any = null;
let useSQLite = false;

try {
  if (Platform.OS !== 'web') {
    const SQLite = require('expo-sqlite');
    // Modern expo-sqlite syntax
    db = SQLite.openDatabaseSync('contexta.db');
    useSQLite = true;
    console.log('[SQLite] Connected successfully to native contexta.db');
  }
} catch (err: any) {
  console.log('[SQLite] Fallback active: native library load skipped/failed.', err.message);
}

/**
 * Initializes database structures.
 */
export async function initDatabase(): Promise<void> {
  if (useSQLite && db) {
    try {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS overrides (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER NOT NULL,
          context TEXT NOT NULL,
          action TEXT NOT NULL,
          isCorrection INTEGER NOT NULL DEFAULT 1
        );
      `);
      console.log('[SQLite] Table "overrides" verified/created.');
    } catch (err: any) {
      console.error('[SQLite] Failed to initialize table, switching to mock:', err);
      useSQLite = false;
    }
  } else {
    console.log('[SQLite] Using memory storage engine for overrides');
  }
}

/**
 * Logs a new user override.
 */
export async function logOverride(context: string, action: string, isCorrection = true): Promise<void> {
  const timestamp = Date.now();
  const corrValue = isCorrection ? 1 : 0;

  if (useSQLite && db) {
    try {
      db.runSync(
        `INSERT INTO overrides (timestamp, context, action, isCorrection) VALUES (?, ?, ?, ?);`,
        [timestamp, context, action, corrValue]
      );
      console.log(`[SQLite] Override logged: ${context} -> ${action}`);
    } catch (err) {
      console.error('[SQLite] Failed to insert record, logging to mock:', err);
      // Fallback
      fallbackStorage.push({
        id: Date.now(),
        timestamp,
        context,
        action,
        isCorrection
      });
    }
  } else {
    fallbackStorage.push({
      id: Date.now(),
      timestamp,
      context,
      action,
      isCorrection
    });
    console.log(`[SQLite Fallback] Override logged: ${context} -> ${action}`);
  }
}

/**
 * Counts how many overrides have been logged today.
 */
export async function getCorrectionsCountToday(): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startTimestamp = startOfDay.getTime();

  if (useSQLite && db) {
    try {
      const result: any = db.getFirstSync(
        `SELECT COUNT(*) as count FROM overrides WHERE timestamp >= ? AND isCorrection = 1;`,
        [startTimestamp]
      );
      return result ? result.count : 0;
    } catch (err) {
      console.error('[SQLite] Query failed, counting from mock:', err);
      // Fallback
    }
  }

  // Fallback counter
  const dailyCorrections = fallbackStorage.filter(
    record => record.timestamp >= startTimestamp && record.isCorrection
  );
  return dailyCorrections.length;
}
