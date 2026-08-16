import type { Migration } from './index';

export const createAppSettingTable: Migration = {
  version: 9,
  name: 'create_app_setting_table',
  sql: `
    CREATE TABLE IF NOT EXISTS app_setting (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `,
};
