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
      "type" TEXT NOT NULL DEFAULT 'OTHER' CHECK ("type" IN ('CASH', 'BANK_ACCOUNT', 'DEBIT_CARD', 'DIGITAL_WALLET', 'SAVINGS', 'INVESTMENT', 'OTHER')),
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
