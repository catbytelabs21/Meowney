import type { Migration } from './index';

export const allowSavingsAccountType: Migration = {
  version: 15,
  name: 'allow_savings_account_type',
  apply(database) {
    database.execSync(`
      PRAGMA defer_foreign_keys = ON;

      DROP TABLE IF EXISTS account_next;

      CREATE TABLE IF NOT EXISTS account_next (
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

      INSERT INTO account_next (
        id,
        notebook_id,
        name,
        description,
        "type",
        icon,
        color,
        created_at,
        updated_at,
        archived_at
      )
      SELECT
        id,
        notebook_id,
        name,
        description,
        CASE
          WHEN "type" IN ('CASH', 'BANK_ACCOUNT', 'DEBIT_CARD', 'DIGITAL_WALLET', 'SAVINGS', 'INVESTMENT', 'OTHER')
            THEN "type"
          ELSE 'OTHER'
        END,
        icon,
        color,
        created_at,
        updated_at,
        archived_at
      FROM account;

      DROP TABLE account;

      ALTER TABLE account_next RENAME TO account;

      CREATE INDEX IF NOT EXISTS idx_account_notebook_id ON account (notebook_id);
    `);
  },
};
