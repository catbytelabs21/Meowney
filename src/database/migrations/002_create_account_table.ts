import type { Migration } from './index';

export const createAccountTable: Migration = {
  version: 2,
  name: 'create_account_table',
  sql: `
    CREATE TABLE IF NOT EXISTS account (
      id TEXT PRIMARY KEY NOT NULL,
      notebook_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NULL,
      icon TEXT NULL,
      color TEXT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT NULL,
      FOREIGN KEY (notebook_id) REFERENCES notebook (id)
    );

    CREATE INDEX IF NOT EXISTS idx_account_notebook_id ON account (notebook_id);
  `,
};
