import type { Migration } from './index';

type TableColumn = {
  name: string;
};

type TableInfo = {
  name: string;
};

type SettingsDefaultNotebookRow = {
  default_notebook_id: string | null;
};

function hasColumn(columns: TableColumn[], name: string) {
  return columns.some((column) => column.name === name);
}

function hasTable(database: Parameters<NonNullable<Migration['apply']>>[0], name: string) {
  const table = database.getFirstSync<TableInfo>(
    `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name = ?
    `,
    name,
  );

  return Boolean(table);
}

export const moveDefaultNotebookToNotebook: Migration = {
  version: 12,
  name: 'move_default_notebook_to_notebook',
  apply(database) {
    const notebookColumns = database.getAllSync<TableColumn>('PRAGMA table_info(notebook)');

    if (!hasColumn(notebookColumns, 'is_default')) {
      database.execSync(`
        ALTER TABLE notebook
          ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0;
      `);
    }

    const settingsExists = hasTable(database, 'settings');

    if (settingsExists) {
      const settings = database.getFirstSync<SettingsDefaultNotebookRow>(
        `
          SELECT default_notebook_id
          FROM settings
          WHERE default_notebook_id IS NOT NULL
          LIMIT 1
        `,
      );

      database.execSync(`
        UPDATE notebook
        SET is_default = 0;
      `);

      if (settings?.default_notebook_id) {
        database.runSync(
          `
            UPDATE notebook
            SET is_default = 1
            WHERE id = ?
              AND archived_at IS NULL
          `,
          settings.default_notebook_id,
        );
      }
    }

    database.execSync(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_notebook_single_default
        ON notebook (is_default)
        WHERE is_default = 1;

      DROP TABLE IF EXISTS settings;
    `);
  },
};
