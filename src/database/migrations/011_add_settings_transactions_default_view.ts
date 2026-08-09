import type { Migration } from './index';

type TableColumn = {
  name: string;
};

export const addSettingsTransactionsDefaultView: Migration = {
  version: 11,
  name: 'add_settings_transactions_default_view',
  apply(database) {
    const columns = database.getAllSync<TableColumn>('PRAGMA table_info(settings)');
    const hasColumn = columns.some((column) => column.name === 'transactions_default_view');

    if (!hasColumn) {
      database.execSync(`
        ALTER TABLE settings
          ADD COLUMN transactions_default_view TEXT NOT NULL DEFAULT 'list';
      `);
    }
  },
};
