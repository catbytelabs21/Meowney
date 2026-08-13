import { database } from '@/database/database';
import type { Notebook } from '@/features/notebooks/types';

type NotebookRow = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  currency: string;
  is_default: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type NotebookInput = {
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  currency: string;
};

function mapNotebook(row: NotebookRow): Notebook {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    color: row.color,
    currency: row.currency,
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

function createId() {
  return `notebook_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export const notebookRepository = {
  listActive() {
    const rows = database.getAllSync<NotebookRow>(
      `
        SELECT *
        FROM notebook
        WHERE archived_at IS NULL
        ORDER BY is_default DESC, datetime(updated_at) DESC, name COLLATE NOCASE ASC
      `,
    );

    return rows.map(mapNotebook);
  },

  getActiveById(id: string) {
    const row = database.getFirstSync<NotebookRow>(
      `
        SELECT *
        FROM notebook
        WHERE id = ?
          AND archived_at IS NULL
      `,
      id,
    );

    return row ? mapNotebook(row) : null;
  },

  getDefaultActive() {
    const row = database.getFirstSync<NotebookRow>(
      `
        SELECT *
        FROM notebook
        WHERE is_default = 1
          AND archived_at IS NULL
        LIMIT 1
      `,
    );

    return row ? mapNotebook(row) : null;
  },

  create(input: NotebookInput) {
    const createdAt = nowIso();
    const notebook: Notebook = {
      id: createId(),
      ...input,
      isDefault: false,
      createdAt,
      updatedAt: createdAt,
      archivedAt: null,
    };

    database.runSync(
      `
        INSERT INTO notebook (
          id,
          name,
          description,
          icon,
          color,
          currency,
          is_default,
          created_at,
          updated_at,
          archived_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, NULL)
      `,
      notebook.id,
      notebook.name,
      notebook.description,
      notebook.icon,
      notebook.color,
      notebook.currency,
      notebook.createdAt,
      notebook.updatedAt,
    );

    return notebook;
  },

  update(id: string, input: NotebookInput) {
    const updatedAt = nowIso();

    database.runSync(
      `
        UPDATE notebook
        SET
          name = ?,
          description = ?,
          icon = ?,
          color = ?,
          currency = ?,
          updated_at = ?
        WHERE id = ?
          AND archived_at IS NULL
      `,
      input.name,
      input.description,
      input.icon,
      input.color,
      input.currency,
      updatedAt,
      id,
    );
  },

  archive(id: string) {
    const archivedAt = nowIso();

    database.runSync(
      `
        UPDATE notebook
        SET
          is_default = 0,
          archived_at = ?,
          updated_at = ?
        WHERE id = ?
          AND archived_at IS NULL
      `,
      archivedAt,
      archivedAt,
      id,
    );
  },

  setDefault(id: string | null) {
    const updatedAt = nowIso();

    database.withTransactionSync(() => {
      database.runSync(
        `
          UPDATE notebook
          SET
            is_default = 0,
            updated_at = ?
          WHERE is_default = 1
        `,
        updatedAt,
      );

      if (id) {
        database.runSync(
          `
            UPDATE notebook
            SET
              is_default = 1,
              updated_at = ?
            WHERE id = ?
              AND archived_at IS NULL
          `,
          updatedAt,
          id,
        );
      }
    });
  },
};
