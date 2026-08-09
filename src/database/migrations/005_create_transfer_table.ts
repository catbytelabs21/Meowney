import type { Migration } from './index';

export const createTransferTable: Migration = {
  version: 5,
  name: 'create_transfer_table',
  sql: `
    CREATE TABLE IF NOT EXISTS transfer (
      id TEXT PRIMARY KEY NOT NULL,
      from_account_id TEXT NOT NULL,
      to_account_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      description TEXT NULL,
      transfer_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT NULL,
      FOREIGN KEY (from_account_id) REFERENCES account (id),
      FOREIGN KEY (to_account_id) REFERENCES account (id)
    );

    CREATE INDEX IF NOT EXISTS idx_transfer_from_account_id ON transfer (from_account_id);
    CREATE INDEX IF NOT EXISTS idx_transfer_to_account_id ON transfer (to_account_id);
    CREATE INDEX IF NOT EXISTS idx_transfer_transfer_at ON transfer (transfer_at);
  `,
};
