import type { Migration } from './index';

export const createSettingsTable: Migration = {
  version: 8,
  name: 'create_settings_table',
  sql: `
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY NOT NULL,
      default_notebook_id TEXT NULL,
      launch_destination TEXT NOT NULL CHECK (launch_destination IN ('notebooks', 'dashboard', 'tabs')),
      notebook_entry_view TEXT NOT NULL CHECK (notebook_entry_view IN ('list', 'dashboard')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (default_notebook_id) REFERENCES notebook (id)
    );

    CREATE INDEX IF NOT EXISTS idx_settings_default_notebook_id
      ON settings (default_notebook_id);
  `,
};
