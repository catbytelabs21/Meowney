import { database } from '@/database/database';
import type { Account, AccountType } from '@/features/accounts/types';

type AccountRow = {
  id: string;
  notebook_id: string;
  name: string;
  description: string | null;
  type: AccountType;
  icon: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type AccountInput = {
  notebookId: string;
  name: string;
  description: string | null;
  type: AccountType;
  icon: string | null;
  color: string | null;
};

function mapAccount(row: AccountRow): Account {
  return {
    id: row.id,
    notebookId: row.notebook_id,
    name: row.name,
    description: row.description,
    type: row.type,
    icon: row.icon,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

function createId() {
  return `account_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export const accountRepository = {
  listActiveByNotebook(notebookId: string) {
    const rows = database.getAllSync<AccountRow>(
      `
        SELECT *
        FROM account
        WHERE notebook_id = ?
          AND archived_at IS NULL
        ORDER BY datetime(updated_at) DESC, name COLLATE NOCASE ASC
      `,
      notebookId,
    );

    return rows.map(mapAccount);
  },

  create(input: AccountInput) {
    const createdAt = nowIso();
    const account: Account = {
      id: createId(),
      ...input,
      createdAt,
      updatedAt: createdAt,
      archivedAt: null,
    };

    database.runSync(
      `
        INSERT INTO account (
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
      `,
      account.id,
      account.notebookId,
      account.name,
      account.description,
      account.type,
      account.icon,
      account.color,
      account.createdAt,
      account.updatedAt,
    );

    return account;
  },

  update(id: string, input: AccountInput) {
    const updatedAt = nowIso();

    database.runSync(
      `
        UPDATE account
        SET
          name = ?,
          description = ?,
          "type" = ?,
          icon = ?,
          color = ?,
          updated_at = ?
        WHERE id = ?
          AND notebook_id = ?
          AND archived_at IS NULL
      `,
      input.name,
      input.description,
      input.type,
      input.icon,
      input.color,
      updatedAt,
      id,
      input.notebookId,
    );
  },

  archive(id: string, notebookId: string) {
    const archivedAt = nowIso();

    database.runSync(
      `
        UPDATE account
        SET
          archived_at = ?,
          updated_at = ?
        WHERE id = ?
          AND notebook_id = ?
          AND archived_at IS NULL
      `,
      archivedAt,
      archivedAt,
      id,
      notebookId,
    );
  },
};
