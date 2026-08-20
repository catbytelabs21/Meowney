import type { Migration } from './index';

export const createSubscriptionTable: Migration = {
  version: 10,
  name: 'create_subscription_table',
  sql: `
    CREATE TABLE IF NOT EXISTS subscription (
      id TEXT PRIMARY KEY NOT NULL,
      notebook_id TEXT NOT NULL,
      name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      payment_frequency TEXT NOT NULL CHECK (
        payment_frequency IN ('weekly', 'monthly', 'quarterly', 'semiannual', 'annual')
      ),
      notes TEXT NULL,
      icon TEXT NULL,
      color TEXT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT NULL,
      FOREIGN KEY (notebook_id) REFERENCES notebook (id)
    );

    CREATE INDEX IF NOT EXISTS idx_subscription_notebook_id ON subscription (notebook_id);
    CREATE INDEX IF NOT EXISTS idx_subscription_payment_frequency ON subscription (payment_frequency);
    CREATE INDEX IF NOT EXISTS idx_subscription_updated_at ON subscription (updated_at);
  `,
};
