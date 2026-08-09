import * as SQLite from 'expo-sqlite';
import { migrations } from './migrations';

export const database = SQLite.openDatabaseSync('meowney.db');

export function initializeDatabase() {
  database.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  migrations.forEach((migration) => {
    const appliedMigration = database.getFirstSync<{ version: number }>(
      'SELECT version FROM schema_migrations WHERE version = ?',
      migration.version,
    );

    if (appliedMigration) {
      return;
    }

    database.withTransactionSync(() => {
      if (migration.apply) {
        migration.apply(database);
      } else if (migration.sql) {
        database.execSync(migration.sql);
      }

      database.runSync(
        'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
        migration.version,
        migration.name,
      );
    });
  });
}
