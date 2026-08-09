import type { Migration } from './index';

export const createCategoryTable: Migration = {
  version: 3,
  name: 'create_category_table',
  sql: `
    CREATE TABLE IF NOT EXISTS category (
      id TEXT PRIMARY KEY NOT NULL,
      notebook_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      icon TEXT NULL,
      color TEXT NULL,
      parent_id TEXT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT NULL,
      FOREIGN KEY (notebook_id) REFERENCES notebook (id),
      FOREIGN KEY (parent_id) REFERENCES category (id)
    );

    CREATE INDEX IF NOT EXISTS idx_category_notebook_id ON category (notebook_id);
    CREATE INDEX IF NOT EXISTS idx_category_parent_id ON category (parent_id);
  `,
};
