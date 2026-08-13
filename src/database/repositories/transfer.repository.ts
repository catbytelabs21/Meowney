import { database } from '@/database/database';
import type { MovementListItem, Transfer } from '@/features/transactions/types';

type TransferRow = {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description: string | null;
  transfer_at: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

type TransferMovementRow = {
  id: string;
  amount: number;
  description: string | null;
  occurred_at: string;
  account_name: string;
  to_account_name: string;
  created_at: string;
  updated_at: string;
};

export type TransferInput = {
  amount: number;
  description: string | null;
  fromAccountId: string;
  toAccountId: string;
  transferAt: string;
};

function mapTransfer(row: TransferRow): Transfer {
  return {
    id: row.id,
    fromAccountId: row.from_account_id,
    toAccountId: row.to_account_id,
    amount: row.amount,
    description: row.description,
    transferAt: row.transfer_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

function mapTransferMovement(row: TransferMovementRow): MovementListItem {
  return {
    id: row.id,
    type: 'transfer',
    amount: row.amount,
    description: row.description,
    occurredAt: row.occurred_at,
    accountName: row.account_name,
    toAccountName: row.to_account_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createId() {
  return `transfer_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export const transferRepository = {
  listActiveByNotebookAndDate(notebookId: string, dateKey: string) {
    const rows = database.getAllSync<TransferMovementRow>(
      `
        SELECT
          tr.id,
          tr.amount,
          tr.description,
          tr.transfer_at AS occurred_at,
          from_account.name AS account_name,
          to_account.name AS to_account_name,
          tr.created_at,
          tr.updated_at
        FROM transfer tr
        INNER JOIN account from_account ON from_account.id = tr.from_account_id
        INNER JOIN account to_account ON to_account.id = tr.to_account_id
        WHERE from_account.notebook_id = ?
          AND to_account.notebook_id = ?
          AND tr.archived_at IS NULL
          AND from_account.archived_at IS NULL
          AND to_account.archived_at IS NULL
          AND date(tr.transfer_at) = date(?)
        ORDER BY datetime(tr.transfer_at) DESC, datetime(tr.created_at) DESC
      `,
      notebookId,
      notebookId,
      dateKey,
    );

    return rows.map(mapTransferMovement);
  },

  listActiveDatesByNotebook(notebookId: string) {
    const rows = database.getAllSync<{ date_key: string; count: number }>(
      `
        SELECT date(tr.transfer_at) AS date_key, COUNT(*) AS count
        FROM transfer tr
        INNER JOIN account from_account ON from_account.id = tr.from_account_id
        INNER JOIN account to_account ON to_account.id = tr.to_account_id
        WHERE from_account.notebook_id = ?
          AND to_account.notebook_id = ?
          AND tr.archived_at IS NULL
          AND from_account.archived_at IS NULL
          AND to_account.archived_at IS NULL
        GROUP BY date(tr.transfer_at)
        ORDER BY date_key DESC
      `,
      notebookId,
      notebookId,
    );

    return rows;
  },

  getActiveById(id: string) {
    const row = database.getFirstSync<TransferRow>(
      `
        SELECT *
        FROM transfer
        WHERE id = ?
          AND archived_at IS NULL
      `,
      id,
    );

    return row ? mapTransfer(row) : null;
  },

  create(input: TransferInput) {
    const createdAt = nowIso();
    const transfer: Transfer = {
      id: createId(),
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      amount: input.amount,
      description: input.description,
      transferAt: input.transferAt,
      createdAt,
      updatedAt: createdAt,
      archivedAt: null,
    };

    database.runSync(
      `
        INSERT INTO transfer (
          id,
          from_account_id,
          to_account_id,
          amount,
          description,
          transfer_at,
          created_at,
          updated_at,
          archived_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
      `,
      transfer.id,
      transfer.fromAccountId,
      transfer.toAccountId,
      transfer.amount,
      transfer.description,
      transfer.transferAt,
      transfer.createdAt,
      transfer.updatedAt,
    );

    return transfer;
  },

  update(id: string, input: TransferInput) {
    const updatedAt = nowIso();

    database.runSync(
      `
        UPDATE transfer
        SET
          from_account_id = ?,
          to_account_id = ?,
          amount = ?,
          description = ?,
          transfer_at = ?,
          updated_at = ?
        WHERE id = ?
          AND archived_at IS NULL
      `,
      input.fromAccountId,
      input.toAccountId,
      input.amount,
      input.description,
      input.transferAt,
      updatedAt,
      id,
    );
  },

  archive(id: string) {
    const archivedAt = nowIso();

    database.runSync(
      `
        UPDATE transfer
        SET archived_at = ?, updated_at = ?
        WHERE id = ?
          AND archived_at IS NULL
      `,
      archivedAt,
      archivedAt,
      id,
    );
  },
};
