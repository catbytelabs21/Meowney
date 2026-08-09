import type { Migration } from './index';

export const createBudgetTable: Migration = {
  version: 6,
  name: 'create_budget_table',
  sql: `
    CREATE TABLE IF NOT EXISTS budget (
      id TEXT PRIMARY KEY NOT NULL,
      category_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'yearly', 'custom')),
      start_date TEXT NOT NULL,
      end_date TEXT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT NULL,
      FOREIGN KEY (category_id) REFERENCES category (id)
    );

    CREATE INDEX IF NOT EXISTS idx_budget_category_id ON budget (category_id);
    CREATE INDEX IF NOT EXISTS idx_budget_period ON budget (period);
    CREATE INDEX IF NOT EXISTS idx_budget_start_date ON budget (start_date);
  `,
};
