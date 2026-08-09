import * as SQLite from 'expo-sqlite';

export const database = SQLite.openDatabaseSync('meowney.db');

export function initializeDatabase() {
  database.execSync(`
    PRAGMA journal_mode = WAL;
  `);
}
