import type { Migration } from './index';

type TableColumn = {
  name: string;
};

export const addAccountType: Migration = {
  version: 9,
  name: 'add_account_type',
  apply(database) {
    const columns = database.getAllSync<TableColumn>('PRAGMA table_info(account)');
    const hasTypeColumn = columns.some((column) => column.name === 'type');

    if (!hasTypeColumn) {
      database.execSync(`
        ALTER TABLE account
          ADD COLUMN "type" TEXT NOT NULL DEFAULT 'OTHER';
      `);
    }
  },
};
