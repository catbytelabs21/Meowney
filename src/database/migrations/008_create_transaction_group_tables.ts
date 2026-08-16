import type { Migration } from './index';

export const createTransactionGroupTables: Migration = {
  version: 8,
  name: 'create_transaction_group_tables',
  sql: `
    CREATE TABLE IF NOT EXISTS transaction_group (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('recurring')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT NULL
    );

    CREATE TABLE IF NOT EXISTS transaction_group_member (
      id TEXT PRIMARY KEY NOT NULL,
      group_id TEXT NOT NULL,
      transaction_id TEXT NOT NULL,
      detached_at TEXT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (group_id) REFERENCES transaction_group (id),
      FOREIGN KEY (transaction_id) REFERENCES "transaction" (id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_transaction_group_member_transaction_id
      ON transaction_group_member (transaction_id);
    CREATE INDEX IF NOT EXISTS idx_transaction_group_member_group_id
      ON transaction_group_member (group_id);
    CREATE INDEX IF NOT EXISTS idx_transaction_group_member_group_detached
      ON transaction_group_member (group_id, detached_at);
  `,
};
