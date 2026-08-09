import { database } from '@/database/database';
import type {
  LaunchDestination,
  NotebookEntryDestination,
  NotebookEntryView,
  Settings,
  TransactionsDefaultView,
} from '@/features/settings/types';

const SETTINGS_ID = 'app_settings';

type SettingsRow = {
  id: string;
  default_notebook_id: string | null;
  launch_destination: LaunchDestination;
  notebook_entry_view: NotebookEntryView;
  notebook_entry_destination: NotebookEntryDestination;
  transactions_default_view: TransactionsDefaultView;
  created_at: string;
  updated_at: string;
};

type TableColumn = {
  name: string;
};

function nowIso() {
  return new Date().toISOString();
}

function hasColumn(columns: TableColumn[], name: string) {
  return columns.some((column) => column.name === name);
}

function ensureSettingsSchema() {
  database.execSync(`
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
  `);

  const columns = database.getAllSync<TableColumn>('PRAGMA table_info(settings)');

  if (!hasColumn(columns, 'notebook_entry_destination')) {
    database.execSync(`
      ALTER TABLE settings
        ADD COLUMN notebook_entry_destination TEXT NOT NULL DEFAULT 'dashboard';
    `);
  }

  if (!hasColumn(columns, 'transactions_default_view')) {
    database.execSync(`
      ALTER TABLE settings
        ADD COLUMN transactions_default_view TEXT NOT NULL DEFAULT 'list';
    `);
  }
}

function mapSettings(row: SettingsRow): Settings {
  return {
    id: row.id,
    defaultNotebookId: row.default_notebook_id,
    launchDestination: row.launch_destination,
    notebookEntryView: row.notebook_entry_view,
    notebookEntryDestination: row.notebook_entry_destination,
    transactionsDefaultView: row.transactions_default_view,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createDefaultSettings() {
  const createdAt = nowIso();

  database.runSync(
    `
      INSERT INTO settings (
        id,
        default_notebook_id,
        launch_destination,
        notebook_entry_view,
        notebook_entry_destination,
        transactions_default_view,
        created_at,
        updated_at
      )
      VALUES (?, NULL, 'notebooks', 'list', 'dashboard', 'list', ?, ?)
    `,
    SETTINGS_ID,
    createdAt,
    createdAt,
  );
}

export const settingsRepository = {
  getOrCreate() {
    ensureSettingsSchema();

    let row = database.getFirstSync<SettingsRow>(
      `
        SELECT *
        FROM settings
        WHERE id = ?
      `,
      SETTINGS_ID,
    );

    if (!row) {
      createDefaultSettings();
      row = database.getFirstSync<SettingsRow>(
        `
          SELECT *
          FROM settings
          WHERE id = ?
        `,
        SETTINGS_ID,
      );
    }

    if (!row) {
      throw new Error('No se pudo crear la configuracion de Meowney.');
    }

    return mapSettings(row);
  },

  setDefaultNotebook(defaultNotebookId: string | null) {
    ensureSettingsSchema();
    const updatedAt = nowIso();

    database.runSync(
      `
        UPDATE settings
        SET
          default_notebook_id = ?,
          updated_at = ?
        WHERE id = ?
      `,
      defaultNotebookId,
      updatedAt,
      SETTINGS_ID,
    );
  },

  setLaunchDestination(launchDestination: LaunchDestination) {
    ensureSettingsSchema();
    const updatedAt = nowIso();

    database.runSync(
      `
        UPDATE settings
        SET
          launch_destination = ?,
          updated_at = ?
        WHERE id = ?
      `,
      launchDestination,
      updatedAt,
      SETTINGS_ID,
    );
  },

  setNotebookEntryDestination(notebookEntryDestination: NotebookEntryDestination) {
    ensureSettingsSchema();
    const updatedAt = nowIso();

    database.runSync(
      `
        UPDATE settings
        SET
          notebook_entry_destination = ?,
          updated_at = ?
        WHERE id = ?
      `,
      notebookEntryDestination,
      updatedAt,
      SETTINGS_ID,
    );
  },

  setTransactionsDefaultView(transactionsDefaultView: TransactionsDefaultView) {
    ensureSettingsSchema();
    const updatedAt = nowIso();

    database.runSync(
      `
        UPDATE settings
        SET
          transactions_default_view = ?,
          updated_at = ?
        WHERE id = ?
      `,
      transactionsDefaultView,
      updatedAt,
      SETTINGS_ID,
    );
  },
};
