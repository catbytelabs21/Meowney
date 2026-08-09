import { database } from '@/database/database';
import type { Notebook } from '@/features/notebooks/types';

type NotebookRow = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  currency: string;
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
        ORDER BY datetime(updated_at) DESC, name COLLATE NOCASE ASC
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

  create(input: NotebookInput) {
    const createdAt = nowIso();
    const notebook: Notebook = {
      id: createId(),
      ...input,
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
          created_at,
          updated_at,
          archived_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
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
};
