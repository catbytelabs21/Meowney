import type { Migration } from './index';

export const createTransactionTable: Migration = {
  version: 4,
  name: 'create_transaction_table',
  sql: `
    CREATE TABLE IF NOT EXISTS "transaction" (
      id TEXT PRIMARY KEY NOT NULL,
      account_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      amount INTEGER NOT NULL,
      description TEXT NULL,
      transaction_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT NULL,
      FOREIGN KEY (account_id) REFERENCES account (id),
      FOREIGN KEY (category_id) REFERENCES category (id)
    );

    CREATE INDEX IF NOT EXISTS idx_transaction_account_id ON "transaction" (account_id);
    CREATE INDEX IF NOT EXISTS idx_transaction_category_id ON "transaction" (category_id);
    CREATE INDEX IF NOT EXISTS idx_transaction_transaction_at ON "transaction" (transaction_at);
  `,
};
