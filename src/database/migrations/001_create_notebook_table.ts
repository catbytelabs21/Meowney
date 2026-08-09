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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT NULL
    );
  `,
};
