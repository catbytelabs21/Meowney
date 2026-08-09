import type { Migration } from './index';

export const createGoalTable: Migration = {
  version: 7,
  name: 'create_goal_table',
  sql: `
    CREATE TABLE IF NOT EXISTS goal (
      id TEXT PRIMARY KEY NOT NULL,
      account_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NULL,
      target_amount INTEGER NOT NULL,
      target_date TEXT NOT NULL,
      icon TEXT NULL,
      color TEXT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT NULL,
      FOREIGN KEY (account_id) REFERENCES account (id)
    );

    CREATE INDEX IF NOT EXISTS idx_goal_account_id ON goal (account_id);
    CREATE INDEX IF NOT EXISTS idx_goal_target_date ON goal (target_date);
  `,
};
