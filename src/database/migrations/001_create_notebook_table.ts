import type { Migration } from './index';

export const createNotebookTable: Migration = {
  version: 1,
  name: 'create_notebook_table',
  sql: `
    CREATE TABLE IF NOT EXISTS notebook (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT NULL,
      icon TEXT NULL,
      color TEXT NULL,
      currency TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_notebook_single_default
      ON notebook (is_default)
      WHERE is_default = 1;
  `,
};
