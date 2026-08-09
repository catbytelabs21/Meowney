import type { Migration } from './index';

type TableColumn = {
  name: string;
};

export const addSettingsNotebookEntryDestination: Migration = {
  version: 10,
  name: 'add_settings_notebook_entry_destination',
  apply(database) {
    const columns = database.getAllSync<TableColumn>('PRAGMA table_info(settings)');
    const hasColumn = columns.some((column) => column.name === 'notebook_entry_destination');

    if (!hasColumn) {
      database.execSync(`
        ALTER TABLE settings
          ADD COLUMN notebook_entry_destination TEXT NOT NULL DEFAULT 'dashboard';
      `);
    }
  },
};
